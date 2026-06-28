"use client";

// モック準拠の新ダッシュボード（フラット青）。/dashboard。
// 反映済み: ①ゲスト挨拶＋ログイン導線 ②試験選択をサイドバーのツリー化 ③ロゴ「ラ」削除
//          ④AIおすすめ枠をログイン状態で出し分け ⑤解答数表示＋推移タブ(正答率/解答数)を実データ化(get_accuracy_timeline)
// 履歴(最近の演習)は現状サンプル。復習/解説/AI特訓モードは別タスク(項目6)。

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { basicExams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  LayoutDashboard,
  BarChart3,
  Clock,
  Settings,
  Search,
  Bell,
  Bot,
  Sparkles,
  ArrowRight,
  Lock,
  Loader2,
  LogIn,
  ChevronRight,
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
type TimelineRow = { week_start: string; answered: number; correct: number };

const EXAM_TARGET: Record<string, number> = { ip: 600, fe: 600, ap: 800 };
const PASS_LINE = 65;
const EXAM_DATE: Record<string, string | null> = { ip: null, fe: null, ap: "2026-10-18" }; // AP秋期は暫定

// サイドバーのツリー（フルネーム）＋ 各試験の演習サブリンク
const EXAM_TREE: { id: string; label: string }[] = [
  { id: "ip", label: "ITパスポート演習" },
  { id: "fe", label: "基本情報演習" },
  { id: "ap", label: "応用情報演習" },
];
const EXAM_SUB: Record<string, { label: string; href: string }[]> = {
  ip: [{ label: "演習メニュー", href: "/exam/ip" }],
  fe: [
    { label: "午前（科目A）", href: "/exam/fe" },
    { label: "午後（科目B）", href: "/exam/fe/b" },
  ],
  ap: [
    { label: "午前", href: "/exam/ap" },
    { label: "午後", href: "/exam/ap/pm" },
  ],
};

function band(acc: number) {
  if (acc >= 70) return { hex: C.good, soft: C.goodSoft, label: "得意" };
  if (acc >= 60) return { hex: C.std, soft: C.stdSoft, label: "標準" };
  if (acc >= 50) return { hex: C.warn, soft: C.warnSoft, label: "あと一歩" };
  return { hex: C.bad, soft: C.badSoft, label: "要対策" };
}
function passScore(acc: number, solved: number, target: number) {
  if (solved === 0) return 0;
  const cov = Math.min(1, solved / target);
  return Math.round(Math.min(100, acc * (0.7 + 0.3 * cov)));
}
function studyHref(examId: string, category: string) {
  return `/exam/${examId}/study?category=${encodeURIComponent(category)}`;
}
function fmtDate(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function calcStreak(days: string[]): number {
  if (!days?.length) return 0;
  const set = new Set(days);
  const cur = new Date();
  if (!set.has(fmtDate(cur))) cur.setDate(cur.getDate() - 1);
  let s = 0;
  while (set.has(fmtDate(cur))) {
    s++;
    cur.setDate(cur.getDate() - 1);
  }
  return s;
}
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
  const diff = Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86400000);
  return diff >= 0 ? diff : null;
}

export default function DashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [overview, setOverview] = useState<Overview[]>([]);
  const [answeredDays, setAnsweredDays] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<string>(basicExams[0].id);
  const [isPremium, setIsPremium] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [name, setName] = useState<string>("");
  const [pmTab, setPmTab] = useState<"am" | "pm">("am");
  const [trendTab, setTrendTab] = useState<"acc" | "count">("acc");

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        setLoading(false);
        return;
      }
      // ゲスト＝匿名ユーザー（is_anonymous）。会員＝Google/メール登録済み。
      const guest = !!user.is_anonymous;
      setIsGuest(guest);
      const meta = user.user_metadata ?? {};
      if (!guest) {
        setName((meta.full_name as string) || (meta.name as string) || user.email?.split("@")[0] || "あなた");
      }

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

      const byExam = basicExams
        .map((e) => ({ id: e.id, n: ov.find((o) => o.exam_id === e.id)?.total ?? 0 }))
        .sort((a, b) => b.n - a.n);
      if (byExam[0] && byExam[0].n > 0) setActiveExam(byExam[0].id);

      setLoading(false);
    })();
  }, []);

  // 推移（直近8週・試験別）を activeExam 切替ごとに取得
  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.rpc("get_accuracy_timeline", { p_exam_id: activeExam, p_weeks: 8 });
      setTimeline((data as TimelineRow[] | null) ?? []);
    })();
  }, [activeExam]);

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
    return { exam, answered, correct, acc, cats, solved, target, score: passScore(acc, solved, target), top: cats[0] ?? null };
  }, [rows, overview, activeExam]);

  const streak = useMemo(() => calcStreak(answeredDays), [answeredDays]);
  const week = useMemo(() => thisWeekDays(answeredDays), [answeredDays]);
  const countdown = daysUntil(EXAM_DATE[activeExam]);
  const hasData = !loading && active.answered > 0;

  // 推移グラフ（タブ: 正答率 / 解答数）
  const trend = useMemo(() => {
    const accArr = timeline.map((t) => (t.answered > 0 ? Math.round((t.correct / t.answered) * 100) : 0));
    const cntArr = timeline.map((t) => t.answered);
    const isAcc = trendTab === "acc";
    const vals = isAcc ? accArr : cntArr;
    const maxV = isAcc ? 100 : Math.max(1, ...cntArr);
    const first = vals[0] ?? 0;
    const last = vals[vals.length - 1] ?? 0;
    return { vals, maxV, first, last, diff: last - first, isAcc, total: cntArr.reduce((a, b) => a + b, 0) };
  }, [timeline, trendTab]);

  // SVG 折れ線の座標
  const chart = useMemo(() => {
    const W0 = 6, W1 = 314, H0 = 130, H1 = 20;
    const n = trend.vals.length;
    const pts = trend.vals.map((v, i) => {
      const x = n <= 1 ? W0 : W0 + ((W1 - W0) * i) / (n - 1);
      const y = H0 + (H1 - H0) * (Math.min(v, trend.maxV) / (trend.maxV || 1));
      return [x, y] as const;
    });
    const poly = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const area = pts.length ? `${poly} ${W1},150 ${W0},150` : "";
    return { pts, poly, area, last: pts[pts.length - 1] };
  }, [trend]);

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <div className="grid min-h-screen" style={{ gridTemplateColumns: "236px 1fr" }}>
        {/* ===== Sidebar ===== */}
        <aside
          className="hidden md:flex flex-col sticky top-0 h-screen"
          style={{ background: C.card, borderRight: `1px solid ${C.line}`, padding: "18px 14px" }}
        >
          {/* ロゴ（「ラ」マーク削除・テキストのみ） */}
          <Link href="/" className="px-2 pb-4 pt-1 leading-tight">
            <span className="block text-[16px] font-bold">過去問演習ラボ</span>
            <span className="block text-[11px] font-normal" style={{ color: C.faint }}>
              AIと、最短で合格へ
            </span>
          </Link>

          <nav className="mt-1 flex flex-col gap-0.5">
            <span
              className="flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-sm font-bold"
              style={{ background: C.brandSoft, color: C.brandDeep }}
            >
              <LayoutDashboard className="h-[18px] w-[18px]" />
              ダッシュボード
            </span>

            {/* 試験を選ぶ（ツリー） */}
            <div className="px-3 pb-1 pt-3 text-[11px] font-bold tracking-wide" style={{ color: C.faint }}>
              試験を選ぶ
            </div>
            {EXAM_TREE.map((ex) => {
              const on = ex.id === activeExam;
              return (
                <div key={ex.id}>
                  <button
                    onClick={() => setActiveExam(ex.id)}
                    className="flex w-full items-center gap-2 rounded-[10px] py-2 pl-5 pr-3 text-left text-[13.5px] transition-colors"
                    style={on ? { background: C.brandSoft, color: C.brandDeep, fontWeight: 700 } : { color: C.muted }}
                  >
                    <span className="text-[10px]" style={{ color: on ? C.brand : C.faint }}>
                      {on ? "▾" : "▸"}
                    </span>
                    {ex.label}
                  </button>
                  {/* アクティブ試験のサブ（午前/午後）をインデント表示 */}
                  {on &&
                    (EXAM_SUB[ex.id] ?? []).map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        className="flex items-center gap-1.5 rounded-[10px] py-1.5 pl-12 pr-3 text-[12.5px]"
                        style={{ color: C.muted }}
                      >
                        <ChevronRight className="h-3 w-3" style={{ color: C.faint }} />
                        {s.label}
                      </Link>
                    ))}
                </div>
              );
            })}

            <div className="my-1 h-px" style={{ background: C.line }} />
            <Link
              href="/analysis"
              className="flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-sm font-medium"
              style={{ color: C.muted }}
            >
              <BarChart3 className="h-[18px] w-[18px]" />
              AI弱点分析
            </Link>
            <Link
              href="#"
              className="flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-sm font-medium"
              style={{ color: C.muted }}
            >
              <Clock className="h-[18px] w-[18px]" />
              学習履歴
            </Link>
            <Link
              href="/account"
              className="flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-sm font-medium"
              style={{ color: C.muted }}
            >
              <Settings className="h-[18px] w-[18px]" />
              {isGuest ? "ログイン・設定" : "設定"}
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
                {isGuest ? "ゲ" : (name || "あ").charAt(0)}
              </span>
              <span className="hidden text-[13px] font-medium sm:inline">{isGuest ? "ゲスト" : `${name}さん`}</span>
            </div>
          </header>

          <div className="w-full max-w-[1280px] px-4 py-6 md:px-7 md:pb-10">
            {/* page head */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold tracking-tight">
                  こんにちは、{isGuest ? "ゲスト" : name}さん
                </h1>
                {isGuest ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                    <p className="text-[13px]" style={{ color: C.muted }}>
                      ログインすると学習進捗が保存され、どの端末でも続きから学べます。
                    </p>
                    <Link
                      href="/account"
                      className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-bold text-white"
                      style={{ background: C.brand }}
                    >
                      <LogIn className="h-4 w-4" />
                      ログイン・新規登録はこちら
                    </Link>
                  </div>
                ) : (
                  <p className="mt-0.5 text-[13.5px]" style={{ color: C.muted }}>
                    今日も合格に一歩近づきましょう。直近の学習からAIがおすすめを用意しました。
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="hidden rounded-[10px] px-3 py-2 text-[12.5px] font-bold sm:inline-flex"
                  style={{ background: C.brandSoft, color: C.brandDeep }}
                >
                  {active.exam.name}
                </span>
                <div className="flex items-center gap-2 rounded-[11px] px-3.5 py-2 text-white" style={{ background: C.dark }}>
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
                    className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-[20px] font-bold"
                    style={{ background: C.brandSoft, color: C.brandDeep }}
                  >
                    ✎
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
                      今週 +{trend.total}問
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

            {/* next action / AIおすすめ（ログイン状態で出し分け） */}
            {isGuest ? (
              <div
                className="mb-[18px] flex flex-col gap-3 rounded-[14px] p-4 sm:flex-row sm:items-center sm:px-5"
                style={{ background: C.brandSoft, border: "1px solid #CFE0FB" }}
              >
                <span
                  className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-white"
                  style={{ background: C.brand }}
                >
                  <Sparkles className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <div className="text-[15px] font-bold">AIレコメンドで「次の一手」まで提案</div>
                  <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>
                    まずは<b style={{ color: C.ink }}>無料会員登録</b>で進捗を保存。
                    <b style={{ color: C.ink }}>有料登録（Pro）</b>なら、AIがあなた専用に何をどの順で対策すべきか提案します。
                  </div>
                </div>
                <div className="flex flex-none gap-2.5">
                  <Link
                    href="/account"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[11px] px-4 py-3 text-[13.5px] font-bold"
                    style={{ background: C.card, color: C.brandDeep, border: "1px solid #CFE0FB" }}
                  >
                    無料会員登録
                  </Link>
                  <Link
                    href="/premium"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[11px] px-4 py-3 text-[13.5px] font-bold text-white"
                    style={{ background: C.brand }}
                  >
                    <Sparkles className="h-4 w-4" />
                    有料でAIレコメンド
                  </Link>
                </div>
              </div>
            ) : (
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
                        正答率 {active.top.acc}%（{active.top.answered}問）。集中演習で底上げが見込めます。
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
            )}

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
                                <span className="text-[11px]" style={{ color: C.faint }}>
                                  ({c.correct}/{c.answered}問)
                                </span>
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

              {/* right: trend(実データ・タブ) + history(サンプル) */}
              <div className="flex flex-col gap-[18px]">
                <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15.5px] font-bold">{trend.isAcc ? "正答率の推移" : "解答数の推移"}</h2>
                    <div className="flex gap-1">
                      {([
                        { k: "acc", t: "正答率" },
                        { k: "count", t: "解答数" },
                      ] as const).map((o) => (
                        <button
                          key={o.k}
                          onClick={() => setTrendTab(o.k)}
                          className="rounded-lg px-3 py-1.5 text-[12px] font-bold"
                          style={
                            trendTab === o.k
                              ? { background: C.dark, color: "#fff" }
                              : { background: C.card, color: C.muted, border: `1px solid ${C.line2}` }
                          }
                        >
                          {o.t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <svg viewBox="0 0 320 150" preserveAspectRatio="none" className="mt-2 h-[150px] w-full">
                    <line x1="0" y1="30" x2="320" y2="30" stroke="#EDF1F6" />
                    <line x1="0" y1="70" x2="320" y2="70" stroke="#EDF1F6" />
                    <line x1="0" y1="110" x2="320" y2="110" stroke="#EDF1F6" />
                    {chart.area && <polygon fill={C.brand} opacity="0.07" points={chart.area} />}
                    {chart.poly && (
                      <polyline
                        fill="none"
                        stroke={C.brand}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={chart.poly}
                      />
                    )}
                    {chart.last && <circle cx={chart.last[0]} cy={chart.last[1]} r="4" fill={C.brand} />}
                  </svg>
                  <div className="mt-2 flex gap-5">
                    <div className="text-[12px]" style={{ color: C.muted }}>
                      今週
                      <b className="ml-1 block text-[18px]" style={{ color: C.ink }}>
                        {trend.isAcc ? `${trend.last}%` : `${trend.last}問`}
                      </b>
                    </div>
                    <div className="text-[12px]" style={{ color: C.muted }}>
                      8週前
                      <b className="ml-1 block text-[18px]" style={{ color: C.ink }}>
                        {trend.isAcc ? `${trend.first}%` : `${trend.first}問`}
                      </b>
                    </div>
                    <div className="text-[12px]" style={{ color: C.muted }}>
                      増減
                      <b
                        className="ml-1 block text-[18px]"
                        style={{ color: trend.diff >= 0 ? C.good : C.bad }}
                      >
                        {trend.diff >= 0 ? "+" : ""}
                        {trend.diff}
                        {trend.isAcc ? "pt" : "問"}
                      </b>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px]" style={{ color: C.faint }}>
                    直近8週・{active.exam.shortName}（実データ）
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
                  <div className="mt-1 text-[11px]" style={{ color: C.faint }}>
                    ※ 履歴は実データ接続を次の工程で実装します。
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
