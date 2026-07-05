"use client";

// モバイル専用ホーム（アクション型）。市場調査の結論＝「開いた瞬間に解き始められる」を最優先。
// 構成: 細いトップバー（試験切替・連続日数）→「今日の5問」ジャンボ →「道の続き」→ その他モード。
// 統計はホームに置かず、報酬（/todayの結果画面）と データタブ(/stats) に回す。

import { useEffect, useState } from "react";
import Link from "next/link";
import { basicExams, displayCategory, learnCategoryFor } from "@/lib/exams";
import { EXAM_TARGET, passScore, scoreBand } from "@/lib/score";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { calcStreak, getActiveExam, setActiveExamStorage, toDayStrings } from "@/lib/streak";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { ArrowRight, Brain, ChevronRight, Flame, Mountain, PenLine, Sparkles } from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8", brandSoft: "#EAF0FE", bad: "#DC2626",
};

type WeakRow = { exam_id: string; category: string; answered: number; correct: number };
type Overview = { exam_id: string; total: number; ai: number };

const shortJa = (name: string) => name.replace("技術者試験", "").replace("試験", "");

// KPIカード用のミニ円形ゲージ（中央に数値・下に分母）
function MiniRing({ pct, color, center, below }: { pct: number; color: string; center: string; below: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const fill = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <span className="relative flex h-[52px] w-[52px] flex-none items-center justify-center">
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#EDF1F6" strokeWidth="5" />
        {fill > 0 && (
          <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${fill} ${c}`} />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[15px] font-bold" style={{ color: C.ink }}>{center}</span>
        <span className="mt-0.5 text-[8.5px]" style={{ color: C.faint }}>{below}</span>
      </span>
    </span>
  );
}

export function MobileHome() {
  const [exam, setExam] = useState("ip");
  const [streak, setStreak] = useState(0);
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
      if (on && res) setStreak(calcStreak(toDayStrings(res.data)));
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

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      {/* 細いトップバー: 試験切替 + 連続日数 */}
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.9)", borderColor: C.line, backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2 px-4 py-2.5">
          <div className="flex gap-1 rounded-full p-0.5" style={{ background: "#EDF1F6" }}>
            {basicExams.map((e) => (
              <button
                key={e.id}
                onClick={() => switchExam(e.id)}
                className="rounded-full px-2.5 py-1 text-[11.5px] font-bold transition-colors"
                style={e.id === exam ? { background: C.brand, color: "#fff" } : { color: "#33415A" }}
              >
                {e.id.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{shortJa(basicExams.find((e) => e.id === exam)?.name ?? "")}</span>
          <span className="flex items-center gap-1 text-[13px] font-bold" style={{ color: streak > 0 ? "#EA580C" : C.faint }}>
            <Flame className="h-4 w-4" /> {streak}日
          </span>
        </div>
      </header>

      <main className="px-4 pb-24 pt-4">
        {/* KPI 2枚（合格可能性スコア・累計演習数）→ タップでデータタブへ */}
        {(() => {
          const target = EXAM_TARGET[exam] ?? 600;
          const ready = acc !== null && solved !== null;
          const score = ready ? passScore(acc, solved, target) : null;
          const band = ready ? scoreBand(score!, solved!) : null;
          const covPct = ready ? Math.min(100, Math.round((solved! / target) * 100)) : 0;
          return (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <Link href="/stats" className="flex items-center gap-2.5 rounded-2xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <MiniRing pct={score ?? 0} color={band?.fg ?? C.brand} center={score === null ? "−" : String(score)} below="/100" />
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-bold" style={{ color: C.muted }}>合格可能性</span>
                  {band ? (
                    <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: band.bg, color: band.fg }}>
                      {band.label}
                    </span>
                  ) : (
                    <span className="mt-1 block text-[11px]" style={{ color: C.faint }}>計測中…</span>
                  )}
                </span>
              </Link>
              <Link href="/stats" className="flex items-center gap-2.5 rounded-2xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <MiniRing pct={covPct} color={C.brand} center={solved === null ? "−" : String(solved)} below={`/${target}問`} />
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-bold" style={{ color: C.muted }}>累計演習数</span>
                  <span className="mt-1 block text-[12px] font-bold" style={{ color: C.brand }}>
                    {solved === null ? "…" : `${covPct}% 達成`}
                  </span>
                </span>
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
            <Sparkles className="h-4 w-4" /> AIが選ぶ、あなたの
          </div>
          <div className="mt-1 text-[30px] font-bold leading-tight">今日の5問</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/85">
            {hasData && weakCat
              ? `弱点「${displayCategory(exam, weakCat)}」から出題します`
              : "解くほどAIの出題があなたの弱点に寄っていきます"}
          </p>
          <span className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[15px] font-bold" style={{ color: "#1D4ED8" }}>
            解きはじめる <ArrowRight className="h-5 w-5" />
          </span>
        </Link>

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
            <span className="block text-[14.5px] font-bold">
              {pathResume ? `「${displayCategory(exam, pathResume.category)}」の道の続きから` : "ステップで学習をはじめる"}
            </span>
            <span className="block text-[12px]" style={{ color: C.muted }}>
              {pathResume ? `${pathResume.done}ステップ完了・学習→過去問演習` : "山道を登りながら、学んで解いて進む"}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 flex-none" style={{ color: C.faint }} />
        </Link>

        {/* AI合格診断（データが無い人の入口） */}
        {hasData === false && (
          <Link
            href={`/shindan/${exam}`}
            className="mt-3 flex items-center gap-3 rounded-2xl p-4"
            style={{ background: C.card, border: `1px solid ${C.line}` }}
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
              <Brain className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-bold">AI合格診断（10問・3分）</span>
              <span className="block text-[12px]" style={{ color: C.muted }}>合格可能性スコアと弱点がその場でわかる</span>
            </span>
            <ChevronRight className="h-5 w-5 flex-none" style={{ color: C.faint }} />
          </Link>
        )}

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
            <span className="block text-[14.5px] font-bold">じっくり演習する</span>
            <span className="block text-[12px]" style={{ color: C.muted }}>年度別・ランダム・分野別・模試・AI予想問題</span>
          </span>
          <ChevronRight className="h-5 w-5 flex-none" style={{ color: C.faint }} />
        </Link>

        <p className="mt-4 text-center text-[11px]" style={{ color: C.faint }}>
          出題はすべて本物のIPA過去問。解答は弱点分析・間違いの復習に自動でつながります。
        </p>
      </main>

      <MobileTabBar />
    </div>
  );
}
