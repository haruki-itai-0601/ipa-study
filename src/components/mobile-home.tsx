"use client";

// モバイル専用ホーム（アクション型）。市場調査の結論＝「開いた瞬間に解き始められる」を最優先。
// 構成: 細いトップバー（試験切替・連続日数）→「今日の5問」ジャンボ →「道の続き」→ その他モード。
// 統計はホームに置かず、報酬（/todayの結果画面）と データタブ(/stats) に回す。

import { useEffect, useState } from "react";
import Link from "next/link";
import { basicExams, displayCategory, learnCategoryFor } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { calcStreak, getActiveExam, setActiveExamStorage, toDayStrings } from "@/lib/streak";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { ArrowRight, Brain, ChevronRight, Flame, Mountain, PenLine, Sparkles } from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8", brandSoft: "#EAF0FE", bad: "#DC2626",
};

type WeakRow = { exam_id: string; category: string; answered: number; correct: number };

const shortJa = (name: string) => name.replace("技術者試験", "").replace("試験", "");

export function MobileHome() {
  const [exam, setExam] = useState("ip");
  const [streak, setStreak] = useState(0);
  const [weakCat, setWeakCat] = useState<string | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null); // null=読み込み中
  const [pathResume, setPathResume] = useState<{ category: string; done: number } | null>(null);

  useEffect(() => {
    setExam(getActiveExam());
  }, []);

  // 連続日数と弱点（今日の5問の出題元）。
  // RPCが認証リフレッシュ等で詰まってもUIを固めないよう、独立処理＋タイムアウトで受ける。
  useEffect(() => {
    let on = true;
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
      const rows = (((res?.data ?? []) as WeakRow[]) || [])
        .map((x) => ({ ...x, answered: Number(x.answered), correct: Number(x.correct) }))
        .filter((r) => r.exam_id === exam && r.answered >= 2);
      if (rows.length > 0) {
        rows.sort((a, b) => a.correct / a.answered - b.correct / b.answered);
        setWeakCat(rows[0].category);
        setHasData(true);
      } else {
        setHasData(false);
      }
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
