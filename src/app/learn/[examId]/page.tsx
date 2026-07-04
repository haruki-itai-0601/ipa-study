"use client";

// 学習する：モード選択ハブ（Canva Design School風）。
// 試験タブ＋3モードカード（ステップで学習／間違いの復習／用語集）。
// コンテンツは中央寄せにして両サイドに余白を残す（将来の広告枠）。
// /learn/[examId]

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { basicExams } from "@/lib/exams";
import { fetchLearnTerms } from "@/lib/supabase-browser";
import { fetchWrongPool } from "@/lib/review";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";
import { BackToDashboard } from "@/components/back-to-dashboard";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8", brandSoft: "#EAF0FE",
  warn: "#C2410C", warnSoft: "#FBEDE6", good: "#0F8A5F", goodSoft: "#E7F3EE",
};

const shortJa = (name: string) => name.replace("試験", "");

export default function LearnHubPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = basicExams.find((e) => e.id === examId);

  const [stats, setStats] = useState<{ cats: number; terms: number; glossary: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [wrong, setWrong] = useState<{ loggedIn: boolean; count: number } | null>(null);

  useEffect(() => {
    let on = true;
    setLoading(true);
    (async () => {
      const rows = await fetchLearnTerms<{ category: string; exam_id: string }>("category, exam_id");
      if (!on) return;
      const mine = rows.filter((r) => r.exam_id === examId);
      setStats({ cats: new Set(mine.map((r) => r.category)).size, terms: mine.length, glossary: rows.length });
      setLoading(false);
    })();
    (async () => {
      const pool = await fetchWrongPool(examId);
      if (!on) return;
      setWrong({ loggedIn: pool.loggedIn, count: pool.ids.length });
    })();
    return () => {
      on = false;
    };
  }, [examId]);

  const hasContent = (stats?.terms ?? 0) > 0;

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 md:px-6">
          <Link href="/" aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-[13px]" style={{ color: C.muted }}>学習する</div>
            <div className="truncate text-[17px] font-bold">{exam ? exam.name : "学習する"}</div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-9 md:px-6">
        <div className="text-center">
          <h1 className="text-[26px] font-bold">3つのモードから選んで始めましょう</h1>
          <p className="mt-1.5 text-[15px]" style={{ color: C.muted }}>
            ステップで学習する・間違いを復習する・用語を引く。目的に合わせて使い分けられます。
          </p>
          <div className="mt-5 inline-flex gap-1.5 rounded-full p-1" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            {basicExams.map((e) => {
              const active = e.id === examId;
              return (
                <Link
                  key={e.id}
                  href={`/learn/${e.id}`}
                  className="whitespace-nowrap rounded-full px-5 py-2 text-[15px] font-bold transition-colors"
                  style={active ? { background: C.brand, color: "#fff" } : { color: "#33415A" }}
                >
                  {shortJa(e.name)}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {/* ① ステップで学習（学習→過去問演習） */}
          <div className="flex flex-col overflow-hidden rounded-[14px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[120px] items-center justify-center" style={{ background: C.brandSoft }}>
              <svg viewBox="0 0 120 60" width="150" height="74" aria-hidden="true">
                <path d="M18,46 L58,16 L100,40" fill="none" stroke={C.brand} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 8" />
                <circle cx="18" cy="46" r="10" fill={C.brand} />
                <path d="M14,46 l3,3 l6,-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="58" cy="16" r="10" fill="#fff" stroke={C.brand} strokeWidth="3" />
                <path d="M55,11.5 l8,4.5 l-8,4.5 z" fill={C.brand} />
                <circle cx="100" cy="40" r="9" fill="#DDE3EC" />
              </svg>
            </div>
            <div className="flex flex-1 flex-col px-6 pb-5 pt-4">
              <div className="text-[19px] font-bold">
                ステップで学習<span className="text-[14px]">（学習 → 過去問演習）</span>
              </div>
              <div className="mt-2 text-[13.5px]" style={{ color: C.muted }}>
                {loading ? "読み込み中…" : hasContent ? `収録 ${stats!.cats}分野・${stats!.terms}語` : "コンテンツ準備中"}
              </div>
              <p className="mb-4 mt-2.5 flex-1 text-[14.5px] leading-relaxed" style={{ color: C.muted }}>
                用語を学んだら、その場で本物の過去問に挑戦。学習→演習の繰り返しで、テストに合格すると次のステップが開きます。
              </p>
              {hasContent ? (
                <Link
                  href={`/learn/${examId}/course`}
                  className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: C.brand }}
                >
                  分野を選んで始める
                </Link>
              ) : (
                <span className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold" style={{ background: "#EDF1F6", color: C.faint }}>
                  準備中
                </span>
              )}
            </div>
          </div>

          {/* ② 間違いの復習 */}
          <div className="flex flex-col overflow-hidden rounded-[14px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[120px] items-center justify-center gap-3.5" style={{ background: C.warnSoft }}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
                <RotateCcw className="h-6 w-6" style={{ color: C.warn }} />
              </span>
              <span className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="h-2.5 w-5 rounded" style={{ background: i < 3 ? C.warn : "#F0CDBA" }} />
                ))}
              </span>
            </div>
            <div className="flex flex-1 flex-col px-6 pb-5 pt-4">
              <div className="text-[19px] font-bold">間違いの復習</div>
              <div className="mt-2 text-[13.5px]" style={{ color: C.muted }}>
                {wrong === null ? "読み込み中…" : wrong.loggedIn ? `復習対象 ${wrong.count}問` : "会員登録で間違いが貯まります"}
              </div>
              <p className="mb-4 mt-2.5 flex-1 text-[14.5px] leading-relaxed" style={{ color: C.muted }}>
                演習で間違えた問題だけを1問ずつやり直して、克服するまで繰り返せます。
              </p>
              <Link
                href={`/learn/${examId}/review`}
                className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: C.warn }}
              >
                間違いをやり直す
              </Link>
            </div>
          </div>

          {/* ③ 用語集 */}
          <div className="flex flex-col overflow-hidden rounded-[14px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[120px] items-center justify-center gap-2.5" style={{ background: C.goodSoft }}>
              {["あ", "か", "さ"].map((k) => (
                <span key={k} className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-white text-[16px] font-bold" style={{ color: "#0F6E56" }}>
                  {k}
                </span>
              ))}
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full" style={{ background: C.good }}>
                <Search className="h-5 w-5 text-white" />
              </span>
            </div>
            <div className="flex flex-1 flex-col px-6 pb-5 pt-4">
              <div className="text-[19px] font-bold">用語集</div>
              <div className="mt-2 text-[13.5px]" style={{ color: C.muted }}>
                {loading ? "読み込み中…" : `収録 ${stats?.glossary ?? 0}語（3試験共通）`}
              </div>
              <p className="mb-4 mt-2.5 flex-1 text-[14.5px] leading-relaxed" style={{ color: C.muted }}>
                全用語を1ページに。五十音・検索・試験レベル・分野の絞り込みですぐ引けます。
              </p>
              <Link
                href={`/learn/glossary?exam=${examId}`}
                className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: C.good }}
              >
                用語集を開く
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[12.5px]" style={{ color: C.faint }}>
          「間違いの復習」の対象は、演習の解答記録から自動で作られます。
        </p>
      </main>
    </div>
  );
}
