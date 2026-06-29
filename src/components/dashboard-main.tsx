"use client";

// モック準拠の新ダッシュボード（フラット青）。/dashboard。
// ラウンド1: ゲスト導線/サイドバーツリー/ロゴ簡素化/AI出し分け/推移タブ実データ化
// ラウンド2(見た目系): A常時展開 B目立たせ+文字大 C試験日ユーザー設定(localStorage) D系統レーダー併用 E正式名称 G弱点分析ナビ削除 J右上→account K試験名チップを右箱と同サイズ
// 別プラン(機能): F学習する H学習履歴フィード I設定 L学習カレンダー M/N分野別ページ 項目6復習/解説/AI特訓

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { basicExams, displayCategory } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  LayoutDashboard,
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
  CalendarDays,
  PenLine,
  BookOpen,
} from "lucide-react";

// ===== フラット青パレット =====
const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", line2: "#DDE3EC", brand: "#1D4ED8", brandDeep: "#163FB0", brandSoft: "#EAF0FE",
  good: "#0F8A5F", goodSoft: "#E3F4EC", warn: "#C2410C", warnSoft: "#FBEADF",
  bad: "#DC2626", badSoft: "#FBE9E9", std: "#8FA0B5", stdSoft: "#EDF1F6", dark: "#0E1B33",
};

type Row = { exam_id: string; category: string; answered: number; correct: number };
type Overview = { exam_id: string; total: number; ai: number };
type TimelineRow = { week_start: string; answered: number; correct: number };
type SeriesKey = "strategy" | "management" | "technology" | "other";
type RadarItem = { label: string; acc: number; answered: number };

const EXAM_TARGET: Record<string, number> = { ip: 600, fe: 600, ap: 800 };
const PASS_LINE = 65;

// サイドバーのナビ定義。基本情報のみ午前/午後にインデント分岐。
type NavItem = { id: string; label: string; href?: string; subs?: { label: string; href: string }[] };
const SOLVE_NAV: NavItem[] = [
  { id: "ip", label: "ITパスポート", href: "/exam/ip" },
  { id: "fe", label: "基本情報", subs: [{ label: "午前", href: "/exam/fe" }, { label: "午後", href: "/exam/fe/b" }] },
  { id: "ap", label: "応用情報", href: "/exam/ap" },
];
const LEARN_NAV: NavItem[] = [
  { id: "ip", label: "ITパスポート", href: "/exam/ip/study" },
  { id: "fe", label: "基本情報", subs: [{ label: "午前", href: "/exam/fe/study" }, { label: "午後", href: "/exam/fe/b" }] },
  { id: "ap", label: "応用情報", href: "/exam/ap/study" },
];
// 試験名を短縮（ITパスポート / 基本情報 / 応用情報）
const shortJa = (name: string) => name.replace("技術者試験", "").replace("試験", "");

// ===== 系統（レーダー用・home-dashboardから移植） =====
const SERIES_OF: Record<string, SeriesKey> = {
  基礎理論: "technology", アルゴリズムとプログラミング: "technology", コンピュータ構成要素: "technology",
  システム構成要素: "technology", ソフトウェア: "technology", ハードウェア: "technology",
  ユーザーインタフェース: "technology", 情報メディア: "technology", データベース: "technology",
  ネットワーク: "technology", セキュリティ: "technology", システム開発技術: "technology",
  ソフトウェア開発管理技術: "technology", プロジェクトマネジメント: "management", サービスマネジメント: "management",
  システム監査: "management", システム戦略: "strategy", システム企画: "strategy",
  経営戦略マネジメント: "strategy", 技術戦略マネジメント: "strategy", ビジネスインダストリ: "strategy",
  企業活動: "strategy", 法務: "strategy",
};
function seriesKeyOf(category: string): SeriesKey {
  return SERIES_OF[category] ?? "other";
}
const SERIES_CATEGORIES: Record<SeriesKey, string[]> = {
  technology: ["基礎理論", "アルゴリズムとプログラミング", "コンピュータ構成要素", "システム構成要素", "ソフトウェア", "ハードウェア", "ユーザーインタフェース", "情報メディア", "データベース", "ネットワーク", "セキュリティ", "システム開発技術", "ソフトウェア開発管理技術"],
  management: ["プロジェクトマネジメント", "サービスマネジメント", "システム監査"],
  strategy: ["システム戦略", "システム企画", "経営戦略マネジメント", "技術戦略マネジメント", "ビジネスインダストリ", "企業活動", "法務"],
  other: [],
};
const SHORT_LABEL: Record<string, string> = {
  アルゴリズムとプログラミング: "アルゴリズム", コンピュータ構成要素: "コンピュータ", システム構成要素: "システム構成",
  ユーザーインタフェース: "UI", ソフトウェア開発管理技術: "SW開発管理", システム開発技術: "開発技術",
  経営戦略マネジメント: "経営戦略", 技術戦略マネジメント: "技術戦略", ビジネスインダストリ: "ビジネス",
  プロジェクトマネジメント: "PM", サービスマネジメント: "サービス", システム監査: "監査", 情報メディア: "メディア",
};
function shortLabel(s: string) {
  return SHORT_LABEL[s] ?? s;
}
function accHex(acc: number): string {
  if (acc >= 70) return C.good;
  if (acc >= 40) return C.warn;
  return C.bad;
}

function band(acc: number) {
  if (acc >= 70) return { hex: C.good };
  if (acc >= 60) return { hex: C.std };
  if (acc >= 50) return { hex: C.warn };
  return { hex: C.bad };
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
  while (set.has(fmtDate(cur))) { s++; cur.setDate(cur.getDate() - 1); }
  return s;
}
function thisWeekDays(days: string[]): number {
  if (!days?.length) return 0;
  const set = new Set(days);
  let n = 0;
  const cur = new Date();
  for (let i = 0; i < 7; i++) { if (set.has(fmtDate(cur))) n++; cur.setDate(cur.getDate() - 1); }
  return n;
}
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86400000);
  return diff >= 0 ? diff : null;
}

// 汎用レーダー（フラット青）
function Radar({ items }: { items: RadarItem[] }) {
  const w = 420, h = 380, cx = 210, cy = 190, rx = 120, ry = 120;
  const n = items.length;
  const axes = items.map((v, i) => {
    const rad = ((-90 + (i * 360) / n) * Math.PI) / 180;
    return { ...v, cos: Math.cos(rad), sin: Math.sin(rad) };
  });
  const pt = (cos: number, sin: number, frac: number): [number, number] => [cx + rx * frac * cos, cy + ry * frac * sin];
  const ring = (frac: number) => axes.map((a) => pt(a.cos, a.sin, frac).join(",")).join(" ");
  const dataPoly = axes.map((a) => pt(a.cos, a.sin, Math.max(0.02, a.acc / 100)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto w-full" style={{ maxWidth: 420, overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(a.cos, a.sin, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />;
      })}
      <polygon points={dataPoly} fill="rgba(29,78,216,0.18)" stroke={C.brand} strokeWidth={2} />
      {axes.map((a, i) => {
        const [x, y] = pt(a.cos, a.sin, Math.max(0.02, a.acc / 100));
        return <circle key={i} cx={x} cy={y} r={3.5} fill={C.brand} />;
      })}
      {axes.map((a, i) => {
        const [lx, ly] = pt(a.cos, a.sin, 1.16);
        const anchor = Math.abs(a.cos) < 0.25 ? "middle" : a.cos > 0 ? "start" : "end";
        const dy = a.sin < -0.3 ? -3 : a.sin > 0.3 ? 15 : 4;
        return (
          <g key={i}>
            <title>{`${a.label}：${a.answered > 0 ? `${a.acc}%` : "未演習"}`}</title>
            <text x={lx} y={ly + dy} textAnchor={anchor} fontSize={13} fontWeight="700" fill="#374151">
              {shortLabel(a.label)}
            </text>
            <text x={lx} y={ly + dy + 16} textAnchor={anchor} fontSize={13} fontWeight="700" fill={a.answered > 0 ? accHex(a.acc) : "#9ca3af"}>
              {a.answered > 0 ? `${a.acc}%` : "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DashboardMain() {
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
  // C: 試験日（試験ごと・localStorage）
  const [examDates, setExamDates] = useState<Record<string, string>>({});
  const [editingDate, setEditingDate] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("examDates");
      if (raw) setExamDates(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsGuest(true); setLoading(false); return; }
      const guest = !!user.is_anonymous;
      setIsGuest(guest);
      const meta = user.user_metadata ?? {};
      if (!guest) setName((meta.full_name as string) || (meta.name as string) || user.email?.split("@")[0] || "あなた");

      const { data: sub } = await supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle();
      setIsPremium(sub?.status === "active" && (!sub.current_period_end || new Date(sub.current_period_end) > new Date()));

      const { data: statData } = await supabase.rpc("get_weakness_stats");
      setRows(statData ? (statData as Row[]).map((x) => ({ ...x, answered: Number(x.answered), correct: Number(x.correct) })) : []);
      const ovRes = await supabase.rpc("get_progress_overview");
      const ov = (ovRes.data as Overview[] | null) ?? [];
      setOverview(ov);
      const daysRes = await supabase.rpc("get_answered_days_jst");
      setAnsweredDays((daysRes.data as string[] | null) ?? []);

      const byExam = basicExams.map((e) => ({ id: e.id, n: ov.find((o) => o.exam_id === e.id)?.total ?? 0 })).sort((a, b) => b.n - a.n);
      if (byExam[0] && byExam[0].n > 0) setActiveExam(byExam[0].id);
      setLoading(false);
    })();
  }, []);

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
    const cats = er.filter((x) => x.answered > 0).map((x) => ({
      category: x.category, answered: x.answered, correct: x.correct, acc: Math.round((x.correct / x.answered) * 100),
    })).sort((a, b) => a.acc - b.acc);
    const ov = overview.find((o) => o.exam_id === activeExam);
    const solved = ov?.total ?? 0;
    const target = EXAM_TARGET[activeExam] ?? 600;

    // 系統ごとの内訳レーダー（中分類を固定軸に・未回答は0/—）
    const catByName = new Map(cats.map((c) => [c.category, c]));
    const bySeries = (key: SeriesKey) => {
      const sc = cats.filter((c) => seriesKeyOf(c.category) === key);
      const a = sc.reduce((s, c) => s + c.answered, 0);
      const cor = sc.reduce((s, c) => s + c.correct, 0);
      return { answered: a, acc: a > 0 ? Math.round((cor / a) * 100) : 0 };
    };
    const seriesRadars = ([
      { key: "strategy" as SeriesKey, label: "ストラテジ系" },
      { key: "management" as SeriesKey, label: "マネジメント系" },
      { key: "technology" as SeriesKey, label: "テクノロジ系" },
    ]).map((s) => ({
      key: s.key, label: s.label, ...bySeries(s.key),
      items: SERIES_CATEGORIES[s.key].map((cat) => {
        const c = catByName.get(cat);
        return { label: cat, acc: c?.acc ?? 0, answered: c?.answered ?? 0 } as RadarItem;
      }),
    }));

    return { exam, answered, acc, cats, solved, target, score: passScore(acc, solved, target), top: cats[0] ?? null, seriesRadars };
  }, [rows, overview, activeExam]);

  const streak = useMemo(() => calcStreak(answeredDays), [answeredDays]);
  const week = useMemo(() => thisWeekDays(answeredDays), [answeredDays]);
  const countdown = daysUntil(examDates[activeExam]);
  const hasData = !loading && active.answered > 0;

  const trend = useMemo(() => {
    const accArr = timeline.map((t) => (t.answered > 0 ? Math.round((t.correct / t.answered) * 100) : 0));
    const cntArr = timeline.map((t) => t.answered);
    const isAcc = trendTab === "acc";
    const vals = isAcc ? accArr : cntArr;
    const maxV = isAcc ? 100 : Math.max(1, ...cntArr);
    return { vals, maxV, first: vals[0] ?? 0, last: vals[vals.length - 1] ?? 0, diff: (vals[vals.length - 1] ?? 0) - (vals[0] ?? 0), isAcc, total: cntArr.reduce((a, b) => a + b, 0) };
  }, [timeline, trendTab]);

  const chart = useMemo(() => {
    const W0 = 6, W1 = 314, H0 = 130, H1 = 20;
    const n = trend.vals.length;
    const pts = trend.vals.map((v, i) => {
      const x = n <= 1 ? W0 : W0 + ((W1 - W0) * i) / (n - 1);
      const y = H0 + (H1 - H0) * (Math.min(v, trend.maxV) / (trend.maxV || 1));
      return [x, y] as const;
    });
    const poly = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    return { poly, area: pts.length ? `${poly} ${W1},150 ${W0},150` : "", last: pts[pts.length - 1] };
  }, [trend]);

  function applyDate(v: string) {
    const next = { ...examDates };
    if (v) next[activeExam] = v;
    else delete next[activeExam];
    setExamDates(next);
    try { localStorage.setItem("examDates", JSON.stringify(next)); } catch {}
  }

  // 共通のナビ項目スタイル（B: 文字大きめ・存在感アップ）
  const navItem = "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-medium transition-colors";
  // 問題を解く / 学習する の項目（単リンク or 午前/午後サブ）
  const renderNavItem = (it: NavItem) =>
    it.href ? (
      <Link key={it.id} href={it.href} className="block rounded-[10px] py-2 pl-9 pr-3 text-[14.5px] font-medium transition-colors hover:bg-gray-50" style={{ color: C.ink }}>
        {it.label}
      </Link>
    ) : (
      <div key={it.id}>
        <div className="py-2 pl-9 pr-3 text-[14.5px] font-medium" style={{ color: C.ink }}>{it.label}</div>
        {(it.subs ?? []).map((s) => (
          <Link key={s.href} href={s.href} className="flex items-center gap-1.5 rounded-[10px] py-1.5 pl-14 pr-3 text-[13px] transition-colors hover:bg-gray-50" style={{ color: C.muted }}>
            <ChevronRight className="h-3.5 w-3.5" style={{ color: C.faint }} /> {s.label}
          </Link>
        ))}
      </div>
    );

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <div className="grid min-h-screen" style={{ gridTemplateColumns: "248px 1fr" }}>
        {/* ===== Sidebar ===== */}
        <aside className="hidden md:flex flex-col sticky top-0 h-screen" style={{ background: C.card, borderRight: `1px solid ${C.line}`, padding: "18px 14px" }}>
          <Link href="/" className="px-2 pb-4 pt-1 leading-tight">
            <span className="block text-[17px] font-bold">過去問演習ラボ</span>
            <span className="block text-[11.5px] font-normal" style={{ color: C.faint }}>AIと、最短で合格へ</span>
          </Link>

          <nav className="mt-1 flex flex-col gap-0.5">
            {/* ① ダッシュボードを選択（クリックで表示中の試験を切替） */}
            <div className="flex items-center gap-2 px-3 pb-0.5 pt-1 text-[13px] font-bold" style={{ color: C.ink }}>
              <LayoutDashboard className="h-[18px] w-[18px]" style={{ color: C.brand }} /> ダッシュボードを選択
            </div>
            {basicExams.map((ex) => {
              const on = ex.id === activeExam;
              return (
                <button
                  key={ex.id}
                  onClick={() => setActiveExam(ex.id)}
                  className="flex w-full items-center rounded-[10px] py-2 pl-9 pr-3 text-left text-[14.5px] transition-colors"
                  style={on ? { background: C.brandSoft, color: C.brandDeep, fontWeight: 700 } : { color: C.ink, fontWeight: 500 }}
                >
                  {shortJa(ex.name)}
                </button>
              );
            })}

            {/* ② 問題を解く */}
            <div className="mt-2 flex items-center gap-2 px-3 pb-0.5 pt-1 text-[13px] font-bold" style={{ color: C.ink }}>
              <PenLine className="h-[18px] w-[18px]" style={{ color: C.brand }} /> 問題を解く
            </div>
            {SOLVE_NAV.map(renderNavItem)}

            {/* ③ 学習する（解説で学ぶ） */}
            <div className="mt-2 flex items-center gap-2 px-3 pb-0.5 pt-1 text-[13px] font-bold" style={{ color: C.ink }}>
              <BookOpen className="h-[18px] w-[18px]" style={{ color: C.brand }} /> 学習する
            </div>
            {LEARN_NAV.map(renderNavItem)}

            <div className="my-1.5 h-px" style={{ background: C.line }} />
            <Link href="#" className={navItem} style={{ color: C.ink }}>
              <Clock className="h-5 w-5" /> 学習履歴
            </Link>
            <Link href="/account" className={navItem} style={{ color: C.ink }}>
              <Settings className="h-5 w-5" /> {isGuest ? "ログイン・設定" : "設定"}
            </Link>
          </nav>

          {!isPremium && (
            <div className="mt-auto rounded-[14px] p-3.5 text-white" style={{ background: C.dark }}>
              <b className="text-[13px]">Pro で午後も最短合格</b>
              <p className="my-1 text-[11.5px]" style={{ color: "#A9B6CC" }}>記述AI採点・詳細弱点分析が使い放題</p>
              <Link href="/premium" className="mt-2.5 block w-full rounded-[9px] py-2.5 text-center text-[13px] font-bold text-white" style={{ background: C.brand }}>
                Proにアップグレード
              </Link>
            </div>
          )}
        </aside>

        {/* ===== Main ===== */}
        <div className="flex flex-col">
          <header className="sticky top-0 z-10 flex items-center gap-3.5 px-4 py-3.5 md:px-7" style={{ background: C.card, borderBottom: `1px solid ${C.line}` }}>
            <div className="flex max-w-[420px] flex-1 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px]" style={{ background: C.bg, border: `1px solid ${C.line}`, color: C.faint }}>
              <Search className="h-4 w-4" /> 問題・分野を検索…
            </div>
            <div className="flex-1" />
            {/* P: ゲストのログイン・新規登録を右上（トップバー）に配置 */}
            {isGuest && (
              <Link href="/account" className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-bold text-white" style={{ background: C.brand }}>
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">ログイン・新規登録</span>
              </Link>
            )}
            <button className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px]" style={{ border: `1px solid ${C.line}`, background: C.card, color: C.muted }} aria-label="通知">
              <Bell className="h-[18px] w-[18px]" />
            </button>
            {/* J: 右上ユーザーをクリックで /account */}
            <Link href="/account" className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1 transition-colors hover:bg-gray-50">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-sm font-bold" style={{ background: C.brandSoft, color: C.brandDeep }}>
                {isGuest ? "ゲ" : (name || "あ").charAt(0)}
              </span>
              <span className="hidden text-[13px] font-medium sm:inline">{isGuest ? "ゲスト" : `${name}さん`}</span>
            </Link>
          </header>

          <div className="w-full max-w-[1280px] px-4 py-6 md:px-7 md:pb-10">
            {/* page head */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold tracking-tight">こんにちは、{isGuest ? "ゲスト" : name}さん</h1>
                {isGuest ? (
                  <p className="mt-1.5 text-[13px]" style={{ color: C.muted }}>
                    ログインすると学習進捗が保存され、どの端末でも続きから学べます（右上からログイン）。
                  </p>
                ) : (
                  <p className="mt-0.5 text-[13.5px]" style={{ color: C.muted }}>今日も合格に一歩近づきましょう。直近の学習からAIがおすすめを用意しました。</p>
                )}
              </div>
              {/* K: 試験名チップを右のボックスと同サイズ（2行・同padding） */}
              <div className="flex items-stretch gap-2.5">
                <div className="hidden flex-col justify-center rounded-[11px] px-3.5 py-2 sm:flex" style={{ background: C.brandSoft, color: C.brandDeep }}>
                  <span className="text-[11px] font-medium opacity-80">対象の試験</span>
                  <b className="text-[15px] leading-tight">{active.exam.name}</b>
                </div>
                {/* C: 試験日ユーザー設定→カウントダウン（独自Y/M/Dピッカー＝ネイティブ不具合回避） */}
                <div className="relative flex flex-col justify-center rounded-[11px] px-3.5 py-2 text-white" style={{ background: C.dark }}>
                  {countdown != null ? (
                    <button onClick={() => setEditingDate((v) => !v)} className="text-left leading-tight">
                      <span className="text-[11px]" style={{ color: "#A9B6CC" }}>本番（{examDates[activeExam]?.slice(5).replace("-", "/")}）まで</span>
                      <br />
                      <b className="text-[18px]">あと{countdown}日 <span className="text-[10px] font-normal" style={{ color: "#A9B6CC" }}>✎</span></b>
                    </button>
                  ) : (
                    <button onClick={() => setEditingDate((v) => !v)} className="flex items-center gap-1.5 text-[13px] font-bold">
                      <CalendarDays className="h-4 w-4" /> 試験日を設定
                    </button>
                  )}
                  {editingDate && (() => {
                    const cur = examDates[activeExam] || fmtDate(new Date());
                    const [y, m, d] = cur.split("-").map(Number);
                    const thisYear = new Date().getFullYear();
                    const apply = (ny: number, nm: number, nd: number) => {
                      const maxD = new Date(ny, nm, 0).getDate();
                      applyDate(`${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(nd, maxD)).padStart(2, "0")}`);
                    };
                    const selCls = "rounded-md border bg-white px-2 py-1.5 text-[13px]";
                    return (
                      <div className="absolute right-0 top-full z-30 mt-2 w-[252px] rounded-xl border bg-white p-3 text-left shadow-xl" style={{ borderColor: C.line2, color: C.ink }}>
                        <div className="mb-2 text-[12px] font-bold">{active.exam.name} の試験日</div>
                        <div className="flex items-center gap-1.5">
                          <select value={y} onChange={(e) => apply(+e.target.value, m, d)} className={selCls} style={{ borderColor: C.line2 }}>
                            {[thisYear, thisYear + 1, thisYear + 2].map((yy) => (<option key={yy} value={yy}>{yy}年</option>))}
                          </select>
                          <select value={m} onChange={(e) => apply(y, +e.target.value, d)} className={selCls} style={{ borderColor: C.line2 }}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (<option key={mm} value={mm}>{mm}月</option>))}
                          </select>
                          <select value={d} onChange={(e) => apply(y, m, +e.target.value)} className={selCls} style={{ borderColor: C.line2 }}>
                            {Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => i + 1).map((dd) => (<option key={dd} value={dd}>{dd}日</option>))}
                          </select>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[12px]">
                          <button onClick={() => { applyDate(""); setEditingDate(false); }} className="font-medium" style={{ color: C.bad }}>削除</button>
                          <button onClick={() => setEditingDate(false)} className="rounded-md px-3 py-1 font-bold text-white" style={{ background: C.brand }}>完了</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* KPI */}
            <div className="mb-[18px] grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[12.5px] font-medium" style={{ color: C.muted }}>合格可能性スコア</div>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <div className="relative h-[78px] w-[78px] flex-none">
                    <svg viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#EDF1F6" strokeWidth="10" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke={C.brand} strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - active.score / 100)} transform="rotate(-90 40 40)" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <b className="text-[23px] leading-none">{loading ? "–" : active.score}</b>
                      <span className="text-[9.5px]" style={{ color: C.muted }}>/ 100</span>
                    </div>
                  </div>
                  <div>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={active.score >= PASS_LINE ? { background: C.goodSoft, color: C.good } : { background: C.warnSoft, color: C.warn }}>
                      {active.score >= PASS_LINE ? "合格圏" : "あと少し"}
                    </span>
                    <div className="mt-2 text-[12px]" style={{ color: C.muted }}>合格ライン <b style={{ color: C.ink }}>{PASS_LINE}</b></div>
                  </div>
                </div>
              </div>

              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[12.5px] font-medium" style={{ color: C.muted }}>連続学習日数</div>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-[24px]" style={{ background: C.warnSoft }}>🔥</span>
                  <div>
                    <div className="text-[30px] font-bold leading-none tracking-tight">{streak}<small className="text-sm font-medium" style={{ color: C.muted }}> 日</small></div>
                    <div className="mt-2 text-[12px]" style={{ color: C.good }}>今週 {week} / 7 日 達成</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[12.5px] font-medium" style={{ color: C.muted }}>累計演習数</div>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-[20px] font-bold" style={{ background: C.brandSoft, color: C.brandDeep }}>✎</span>
                  <div>
                    <div className="text-[30px] font-bold leading-none tracking-tight">{loading ? "–" : active.solved.toLocaleString()}<small className="text-sm font-medium" style={{ color: C.muted }}> 問</small></div>
                    <div className="mt-2 text-[12px]" style={{ color: C.muted }}>今週 +{trend.total}問</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[12.5px] font-medium" style={{ color: C.muted }}>平均正答率</div>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-[22px]" style={{ background: C.goodSoft, color: C.good }}>◎</span>
                  <div>
                    <div className="text-[30px] font-bold leading-none tracking-tight">{loading ? "–" : active.acc}<small className="text-sm font-medium" style={{ color: C.muted }}> %</small></div>
                    <div className="mt-2 text-[12px]" style={{ color: C.muted }}>{active.answered.toLocaleString()}問で算出</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AIおすすめ（ログイン状態で出し分け） */}
            {isGuest ? (
              <div className="mb-[18px] flex flex-col gap-3 rounded-[14px] p-4 sm:flex-row sm:items-center sm:px-5" style={{ background: C.brandSoft, border: "1px solid #CFE0FB" }}>
                <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-white" style={{ background: C.brand }}><Sparkles className="h-6 w-6" /></span>
                <div className="flex-1">
                  <div className="text-[15px] font-bold">AIレコメンドで「次の一手」まで提案</div>
                  <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>まずは<b style={{ color: C.ink }}>無料会員登録</b>で進捗を保存。<b style={{ color: C.ink }}>有料登録（Pro）</b>なら、AIがあなた専用に何をどの順で対策すべきか提案します。</div>
                </div>
                <div className="flex flex-none gap-2.5">
                  <Link href="/account" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[11px] px-4 py-3 text-[13.5px] font-bold" style={{ background: C.card, color: C.brandDeep, border: "1px solid #CFE0FB" }}>無料会員登録</Link>
                  <Link href="/premium" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[11px] px-4 py-3 text-[13.5px] font-bold text-white" style={{ background: C.brand }}><Sparkles className="h-4 w-4" />有料でAIレコメンド</Link>
                </div>
              </div>
            ) : (
              <div className="mb-[18px] flex flex-col items-start gap-4 rounded-[14px] p-4 sm:flex-row sm:items-center sm:px-5" style={{ background: C.brandSoft, border: "1px solid #CFE0FB" }}>
                <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-white" style={{ background: C.brand }}><Bot className="h-6 w-6" /></span>
                <div className="flex-1">
                  <div className="text-[11px] font-bold tracking-wide" style={{ color: C.brandDeep }}>AIからの今日のおすすめ</div>
                  {hasData && active.top ? (
                    <>
                      <div className="mt-0.5 text-[15px] font-bold">弱点の <span style={{ color: C.bad }}>「{displayCategory(activeExam, active.top.category)}」</span> を重点演習しましょう</div>
                      <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>正答率 {active.top.acc}%（{active.top.answered}問）。集中演習で底上げが見込めます。</div>
                    </>
                  ) : (
                    <>
                      <div className="mt-0.5 text-[15px] font-bold">まずは1問、解いてみましょう</div>
                      <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>解くと、ここにAIがあなた専用のおすすめを表示します。</div>
                    </>
                  )}
                </div>
                <Link href={hasData && active.top ? studyHref(activeExam, active.top.category) : `/challenge/${activeExam}`} className="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] px-5 py-3 text-[13.5px] font-bold text-white" style={{ background: C.brand }}>
                  {hasData && active.top ? `「${displayCategory(activeExam, active.top.category)}」を演習` : "まず解いてみる"}<ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* D: 弱点分析（全幅）= 弱点バー + 系統ごとのレーダー */}
            <div className="mb-[18px] rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between">
                <h2 className="text-[15.5px] font-bold">AI弱点分析 — 分野別正答率</h2>
                <div className="flex gap-1">
                  {(["am", "pm"] as const).map((t) => (
                    <button key={t} onClick={() => setPmTab(t)} className="rounded-lg px-3 py-1.5 text-[12px] font-bold" style={pmTab === t ? { background: C.dark, color: "#fff" } : { background: C.card, color: C.muted, border: `1px solid ${C.line2}` }}>
                      {t === "am" ? "午前" : "午後"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1 text-[11.5px]" style={{ color: C.faint }}>正答率の低い分野から表示。クリックでその分野を演習できます。</div>

              {pmTab === "pm" ? (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl px-4 py-10 text-center" style={{ background: C.bg, border: `1px dashed ${C.line2}` }}>
                  <Lock className="mb-2 h-6 w-6" style={{ color: C.faint }} />
                  <p className="text-[13px] font-bold">午後（記述）の分析は Pro 機能です</p>
                  <Link href="/premium" className="mt-2 text-[12px] font-bold" style={{ color: C.brand }}>Proを見る →</Link>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center gap-2 py-14" style={{ color: C.faint }}><Loader2 className="h-5 w-5 animate-spin" /> 読み込み中…</div>
              ) : active.cats.length === 0 ? (
                <div className="mt-4 rounded-xl px-4 py-10 text-center" style={{ background: C.bg, border: `1px dashed ${C.line2}` }}>
                  <p className="text-[14px] font-bold">まだデータがありません</p>
                  <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>何問か解くと、ここに分野別の弱点が表示されます。</p>
                  <Link href={`/challenge/${activeExam}`} className="mt-3 inline-flex items-center gap-1.5 rounded-[11px] px-5 py-2.5 text-[13px] font-bold text-white" style={{ background: C.brand }}>まず解いてみる <ArrowRight className="h-4 w-4" /></Link>
                </div>
              ) : (
                <>
                  {/* 弱点バー（弱点順・件数つき） */}
                  <div className="mt-3.5 grid gap-x-6 gap-y-3 md:grid-cols-2">
                    {active.cats.slice(0, 8).map((c) => {
                      const b = band(c.acc);
                      return (
                        <Link key={c.category} href={studyHref(activeExam, c.category)} className="group block">
                          <div className="mb-1.5 flex items-center justify-between text-[13px]">
                            <span className="flex items-center gap-2 font-medium">
                              <span className="h-[7px] w-[7px] rounded-full" style={{ background: b.hex }} />
                              {displayCategory(activeExam, c.category)}
                              <span className="text-[11px]" style={{ color: C.faint }}>({c.correct}/{c.answered}問)</span>
                            </span>
                            <span className="font-bold tabular-nums" style={{ color: b.hex }}>{c.acc}%</span>
                          </div>
                          <div className="h-[9px] overflow-hidden rounded-md" style={{ background: "#EDF1F6" }}>
                            <div className="h-full rounded-md" style={{ width: `${c.acc}%`, background: b.hex }} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* 系統ごとの内訳レーダー（2枚目） */}
                  <div className="mt-6 border-t pt-4" style={{ borderColor: C.line }}>
                    <div className="mb-2 flex items-center gap-1.5 text-[13.5px] font-bold" style={{ color: C.ink }}>
                      <span className="inline-block h-3.5 w-1 rounded-full" style={{ background: C.brand }} /> 系統ごとの内訳（分野別）
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {active.seriesRadars.map((s) => (
                        <div key={s.key} className="rounded-xl p-3" style={{ border: `1px solid ${C.line}` }}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[14px] font-bold">{s.label}</span>
                            <span className="text-[14px] font-bold" style={{ color: s.answered > 0 ? accHex(s.acc) : C.faint }}>{s.answered > 0 ? `${s.acc}%` : "—"}</span>
                          </div>
                          <Radar items={s.items} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3.5 text-[11.5px]" style={{ color: C.muted, borderColor: C.line }}>
                    {[{ c: C.bad, t: "要対策 (〜49%)" }, { c: C.warn, t: "あと一歩 (50〜59%)" }, { c: C.std, t: "標準 (60〜69%)" }, { c: C.good, t: "得意 (70%〜)" }].map((l) => (
                      <span key={l.t} className="flex items-center gap-1.5"><i className="h-[9px] w-[9px] rounded-[3px]" style={{ background: l.c, display: "inline-block" }} />{l.t}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 推移(実データ・タブ) + 履歴(サンプル) */}
            <div className="grid gap-[18px] lg:grid-cols-2">
              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[15.5px] font-bold">{trend.isAcc ? "正答率の推移" : "解答数の推移"}</h2>
                  <div className="flex gap-1">
                    {([{ k: "acc", t: "正答率" }, { k: "count", t: "解答数" }] as const).map((o) => (
                      <button key={o.k} onClick={() => setTrendTab(o.k)} className="rounded-lg px-3 py-1.5 text-[12px] font-bold" style={trendTab === o.k ? { background: C.dark, color: "#fff" } : { background: C.card, color: C.muted, border: `1px solid ${C.line2}` }}>{o.t}</button>
                    ))}
                  </div>
                </div>
                <svg viewBox="0 0 320 150" preserveAspectRatio="none" className="mt-2 h-[150px] w-full">
                  <line x1="0" y1="30" x2="320" y2="30" stroke="#EDF1F6" />
                  <line x1="0" y1="70" x2="320" y2="70" stroke="#EDF1F6" />
                  <line x1="0" y1="110" x2="320" y2="110" stroke="#EDF1F6" />
                  {chart.area && <polygon fill={C.brand} opacity="0.07" points={chart.area} />}
                  {chart.poly && <polyline fill="none" stroke={C.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={chart.poly} />}
                  {chart.last && <circle cx={chart.last[0]} cy={chart.last[1]} r="4" fill={C.brand} />}
                </svg>
                <div className="mt-2 flex gap-5">
                  <div className="text-[12px]" style={{ color: C.muted }}>今週<b className="ml-1 block text-[18px]" style={{ color: C.ink }}>{trend.isAcc ? `${trend.last}%` : `${trend.last}問`}</b></div>
                  <div className="text-[12px]" style={{ color: C.muted }}>8週前<b className="ml-1 block text-[18px]" style={{ color: C.ink }}>{trend.isAcc ? `${trend.first}%` : `${trend.first}問`}</b></div>
                  <div className="text-[12px]" style={{ color: C.muted }}>増減<b className="ml-1 block text-[18px]" style={{ color: trend.diff >= 0 ? C.good : C.bad }}>{trend.diff >= 0 ? "+" : ""}{trend.diff}{trend.isAcc ? "pt" : "問"}</b></div>
                </div>
                <div className="mt-2 text-[11px]" style={{ color: C.faint }}>直近8週・{active.exam.shortName}（実データ）</div>
              </div>

              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[15.5px] font-bold">最近の演習</h2>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: C.warnSoft, color: C.warn }}>サンプル</span>
                </div>
                <div className="mt-2">
                  {[
                    { tag: "午前", cat: "セキュリティ", sub: "8 / 10 問 正解", sc: "80%", scc: C.good, t: "今日 14:30" },
                    { tag: "午後", cat: "設問2 データベース", sub: "AI採点「正規化は的確。可用性の考慮が不足」", sc: "18/25", scc: C.ink, t: "昨日 22:10" },
                    { tag: "午前", cat: "ネットワーク", sub: "4 / 10 問 正解", sc: "40%", scc: C.bad, t: "昨日 08:00" },
                  ].map((h, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                      <span className="flex-none rounded-md px-2 py-0.5 text-[10.5px] font-bold" style={h.tag === "午前" ? { background: C.brandSoft, color: C.brandDeep } : { background: "#EEE9FB", color: "#5B3FB0" }}>{h.tag}</span>
                      <div className="min-w-0 flex-1"><b className="text-[13px] font-medium">{h.cat}</b><p className="truncate text-[11.5px]" style={{ color: C.muted }}>{h.sub}</p></div>
                      <span className="flex-none text-[13.5px] font-bold tabular-nums" style={{ color: h.scc }}>{h.sc}</span>
                      <span className="w-[74px] flex-none text-right text-[11px]" style={{ color: C.faint }}>{h.t}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: C.faint }}>※ 履歴は実データ接続を次の工程で実装します。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
