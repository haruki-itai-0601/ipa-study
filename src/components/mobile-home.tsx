"use client";

// モバイル専用ホーム（アクション型）。市場調査の結論＝「開いた瞬間に解き始められる」を最優先。
// 構成: 細いトップバー（試験切替・連続日数）→「今日の5問」ジャンボ →「道の続き」→ その他モード。
// 統計はホームに置かず、報酬（/todayの結果画面）と データタブ(/stats) に回す。

import { useEffect, useState } from "react";
import Link from "next/link";
import { displayCategory, learnCategoryFor } from "@/lib/exams";
import { EXAM_TARGET, passScore, scoreBand } from "@/lib/score";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { calcStreak, getActiveExam, setActiveExamStorage, toDayStrings } from "@/lib/streak";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { MobileTopBar } from "@/components/mobile-top-bar";
import { ArrowRight, Brain, ChevronRight, Mountain, PenLine, Sparkles } from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#6B7688",
  line: "#E7EBF1", brand: "#1D4ED8", brandSoft: "#EAF0FE", bad: "#DC2626",
};

type WeakRow = { exam_id: string; category: string; answered: number; correct: number };
type Overview = { exam_id: string; total: number; ai: number };

// KPIの1行カード（左＝数値・右＝ラベル）。コンパクト＆ひと目で読める形。
function KpiRow({ value, unit, color, label }: { value: string; unit?: string; color: string; label: string }) {
  return (
    <span className="flex w-full items-center justify-between">
      <span className="text-[21px] font-bold leading-none" style={{ color }}>
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-medium" style={{ color: C.faint }}>{unit}</span>}
      </span>
      <span className="text-[12px] font-bold" style={{ color: C.muted }}>{label}</span>
    </span>
  );
}

export function MobileHome() {
  const [exam, setExam] = useState("ip");
  const [days, setDays] = useState<string[]>([]);
  const [weakCat, setWeakCat] = useState<string | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null); // null=読み込み中
  const [acc, setAcc] = useState<number | null>(null); // 選択試験の平均正答率
  const [solved, setSolved] = useState<number | null>(null); // 累計演習数(重複除く)
  const [pathResume, setPathResume] = useState<{ category: string; done: number } | null>(null);

  useEffect(() => {
    setExam(getActiveExam());
  }, []);

  // 連続日数と弱点（今日の5問の出題元）。
  // RPCが認証リフレッシュ等で詰まってもUIを固めないよう、独立処理＋タイムアウトで受ける。
  useEffect(() => {
    let on = true;
    // 試験切替時に前の試験の値が残らないようリセット
    setWeakCat(null);
    setHasData(null);
    setAcc(null);
    setSolved(null);
    const timeout = <T,>(p: PromiseLike<T>, ms: number): Promise<T | null> =>
      Promise.race([Promise.resolve(p).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
    const supabase = createSupabaseBrowserClient();

    (async () => {
      const res = await timeout(supabase.rpc("get_answered_days_jst"), 8000);
      if (on && res) setDays(toDayStrings(res.data));
    })();

    (async () => {
      const res = await timeout(supabase.rpc("get_weakness_stats"), 8000);
      if (!on) return;
      const examRows = (((res?.data ?? []) as WeakRow[]) || [])
        .map((x) => ({ ...x, answered: Number(x.answered), correct: Number(x.correct) }))
        .filter((r) => r.exam_id === exam);
      // 平均正答率（合格可能性スコアの材料）
      const answered = examRows.reduce((s, r) => s + r.answered, 0);
      const correct = examRows.reduce((s, r) => s + r.correct, 0);
      setAcc(answered > 0 ? Math.round((correct / answered) * 100) : 0);
      // 弱点（今日の5問の出題元）は最低2問解いた分野から
      const rows = examRows.filter((r) => r.answered >= 2);
      if (rows.length > 0) {
        rows.sort((a, b) => a.correct / a.answered - b.correct / b.answered);
        setWeakCat(rows[0].category);
        setHasData(true);
      } else {
        setHasData(false);
      }
    })();

    (async () => {
      const res = await timeout(supabase.rpc("get_progress_overview"), 8000);
      if (!on) return;
      const ov = ((res?.data ?? []) as Overview[]).find((o) => o.exam_id === exam);
      setSolved(ov?.total ?? 0);
    })();

    return () => {
      on = false;
    };
  }, [exam]);

  // 道の続き（localStorageのパス進捗から、進行中の分野を1つ拾う）
  useEffect(() => {
    try {
      const prefix = `learnPathV1:${exam}:`;
      let found: { category: string; done: number } | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const done = (JSON.parse(localStorage.getItem(key) ?? "[]") as string[]).length;
        if (done > 0 && (!found || done > found.done)) {
          found = { category: key.slice(prefix.length), done };
        }
      }
      setPathResume(found);
    } catch {
      setPathResume(null);
    }
  }, [exam]);

  const switchExam = (id: string) => {
    setExam(id);
    setActiveExamStorage(id);
  };

  const streak = calcStreak(days);

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      {/* 共通トップバー（試験プルダウン＋試験日カウントダウン） */}
      <MobileTopBar exam={exam} onExamChange={switchExam} />

      <main className="px-4 pb-24 pt-4">
        {/* KPI 4枚（1行型: 左=数値・右=ラベル）→ タップでデータタブへ */}
        {(() => {
          const target = EXAM_TARGET[exam] ?? 600;
          const ready = acc !== null && solved !== null;
          const score = ready ? passScore(acc, solved, target) : null;
          const band = ready ? scoreBand(score!, solved!) : null;
          const kpiCard = "flex items-center rounded-xl px-3.5 py-3";
          const kpiStyle = { background: C.card, border: `1px solid ${C.line}` };
          return (
            <div className="mb-3 grid grid-cols-2 gap-2.5">
              <Link href="/stats" className={kpiCard} style={kpiStyle}>
                <KpiRow value={score === null ? "−" : String(score)} unit="/100" color={band?.fg ?? C.ink} label="合格可能性" />
              </Link>
              <Link href="/stats" className={kpiCard} style={kpiStyle}>
                <KpiRow value={solved === null ? "−" : String(solved)} unit="問" color={C.brand} label="累計演習" />
              </Link>
              <Link href="/stats" className={kpiCard} style={kpiStyle}>
                <KpiRow value={String(streak)} unit="日" color="#EA580C" label="連続学習" />
              </Link>
              <Link href="/stats" className={kpiCard} style={kpiStyle}>
                <KpiRow value={acc === null ? "−" : String(acc)} unit="%" color="#0F8A5F" label="平均正答率" />
              </Link>
            </div>
          );
        })()}

        {/* 今日の5問（主役） */}
        <Link
          href={`/today?exam=${exam}`}
          className="block rounded-3xl p-5 text-white transition-transform active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg, #1D4ED8, #4F46E5)", boxShadow: "0 12px 28px rgba(29,78,216,0.32)" }}
        >
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-white/85">
            <Sparkles className="h-4 w-4" /> 弱点分析に基づく、あなたの
          </div>
          <div className="mt-1 text-[30px] font-bold leading-tight">今日の5問</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/85">
            {hasData && weakCat
              ? `弱点「${displayCategory(exam, weakCat)}」から出題します`
              : "解くほど、あなたの弱点に合わせて出題します"}
          </p>
          <span className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[15px] font-bold" style={{ color: "#1D4ED8" }}>
            解きはじめる <ArrowRight className="h-5 w-5" />
          </span>
        </Link>

        {/* AI合格診断（何も解いていない人の入口・今日の5問の直下で薄ピンクで少し目立たせる） */}
        {hasData === false && (
          <Link
            href={`/shindan/${exam}`}
            className="mt-3 flex items-center gap-3 rounded-2xl p-4"
            style={{ background: "#FDF2F8", border: "1px solid #F9A8D4" }}
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: "#FCE7F3", color: "#DB2777" }}>
              <Brain className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold">AI合格診断（10問・3分）</span>
              <span className="block text-[13px]" style={{ color: "#9D2463" }}>合格可能性スコアと弱点がその場でわかる</span>
            </span>
            <ChevronRight className="h-5 w-5 flex-none" style={{ color: "#DB2777" }} />
          </Link>
        )}

        {/* 道の続き */}
        <Link
          href={pathResume ? `/learn/${exam}/${encodeURIComponent(pathResume.category)}` : `/learn/${exam}`}
          className="mt-3 flex items-center gap-3 rounded-2xl p-4"
          style={{ background: C.card, border: `1px solid ${C.line}` }}
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: C.brandSoft, color: C.brand }}>
            <Mountain className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold">
              {pathResume ? (
                `「${displayCategory(exam, pathResume.category)}」の道の続きから`
              ) : (
                <>ステップで学習<span className="whitespace-nowrap text-[11.5px]">（学習 → 過去問演習）</span></>
              )}
            </span>
            <span className="block text-[13px]" style={{ color: C.muted }}>
              {pathResume ? `${pathResume.done}ステップ完了・学習→過去問演習` : "山道を登りながら、学んで解いて進む"}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 flex-none" style={{ color: C.faint }} />
        </Link>

        {/* その他の演習モード */}
        <Link
          href={`/exam/${exam}/past`}
          className="mt-3 flex items-center gap-3 rounded-2xl p-4"
          style={{ background: C.card, border: `1px solid ${C.line}` }}
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: "#EDF1F6", color: C.muted }}>
            <PenLine className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold">じっくり演習する</span>
            <span className="block text-[13px]" style={{ color: C.muted }}>年度別・ランダム・分野別・模試・AI予想問題</span>
          </span>
          <ChevronRight className="h-5 w-5 flex-none" style={{ color: C.faint }} />
        </Link>

        <p className="mt-4 text-center text-[11px]" style={{ color: C.faint }}>
          出題はすべて本物のIPA過去問。解答は弱点分析・間違えた問題の復習に自動でつながります。
        </p>
      </main>

      <MobileTabBar />
    </div>
  );
}
