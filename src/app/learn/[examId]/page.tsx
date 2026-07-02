"use client";

// 学習する：モード選択ハブ（Canva Design School風）。
// 試験タブ＋3モードカード（順を追って学ぶ／間違いの復習／用語集）。
// コンテンツは中央寄せにして両サイドに余白を残す（将来の広告枠）。
// /learn/[examId]

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { basicExams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";

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

  const [stats, setStats] = useState<{ cats: number; terms: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    setLoading(true);
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("learn_terms").select("category").eq("exam_id", examId);
      if (!on) return;
      const rows = (data as { category: string }[]) ?? [];
      setStats({ cats: new Set(rows.map((r) => r.category)).size, terms: rows.length });
      setLoading(false);
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
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7 md:px-6">
        <div className="text-center">
          <h1 className="text-[21px] font-bold">3つのモードから選んで始めましょう</h1>
          <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>
            道筋に沿って学ぶ・間違いを復習する・用語を引く。目的に合わせて使い分けられます。
          </p>
          <div className="mt-4 inline-flex gap-1.5 rounded-full p-1" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            {basicExams.map((e) => {
              const active = e.id === examId;
              return (
                <Link
                  key={e.id}
                  href={`/learn/${e.id}`}
                  className="whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors"
                  style={active ? { background: C.brand, color: "#fff" } : { color: "#33415A" }}
                >
                  {shortJa(e.name)}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* ① 順を追って学ぶ */}
          <div className="flex flex-col overflow-hidden rounded-[14px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[92px] items-center justify-center" style={{ background: C.brandSoft }}>
              <svg viewBox="0 0 120 60" width="118" height="58" aria-hidden="true">
                <path d="M18,46 L58,16 L100,40" fill="none" stroke={C.brand} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 8" />
                <circle cx="18" cy="46" r="10" fill={C.brand} />
                <path d="M14,46 l3,3 l6,-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="58" cy="16" r="10" fill="#fff" stroke={C.brand} strokeWidth="3" />
                <path d="M55,11.5 l8,4.5 l-8,4.5 z" fill={C.brand} />
                <circle cx="100" cy="40" r="9" fill="#DDE3EC" />
              </svg>
            </div>
            <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
              <div className="text-[15.5px] font-bold">順を追って学ぶ</div>
              <div className="mt-1.5 text-[11.5px]" style={{ color: C.muted }}>
                {loading ? "読み込み中…" : hasContent ? `収録 ${stats!.cats}分野・${stats!.terms}語` : "コンテンツ準備中"}
              </div>
              <p className="mb-3 mt-2 flex-1 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
                分野ごとの用語・概念を、道筋に沿って上から順にたどって学べます。
              </p>
              {hasContent ? (
                <Link
                  href={`/learn/${examId}/course`}
                  className="block w-full rounded-[10px] py-2.5 text-center text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: C.brand }}
                >
                  分野を選んで始める
                </Link>
              ) : (
                <span className="block w-full rounded-[10px] py-2.5 text-center text-[13px] font-bold" style={{ background: "#EDF1F6", color: C.faint }}>
                  準備中
                </span>
              )}
            </div>
          </div>

          {/* ② 間違いの復習 */}
          <div className="flex flex-col overflow-hidden rounded-[14px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[92px] items-center justify-center gap-3" style={{ background: C.warnSoft }}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                <RotateCcw className="h-5 w-5" style={{ color: C.warn }} />
              </span>
              <span className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="h-2 w-3.5 rounded" style={{ background: i < 3 ? C.warn : "#F0CDBA" }} />
                ))}
              </span>
            </div>
            <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
              <div className="text-[15.5px] font-bold">間違いの復習</div>
              <div className="mt-1.5">
                <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "#EDF1F6", color: C.muted }}>準備中</span>
              </div>
              <p className="mb-3 mt-2 flex-1 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
                演習で間違えた問題だけを1問ずつ見直して、弱点をつぶします。
              </p>
              <span className="block w-full rounded-[10px] py-2.5 text-center text-[13px] font-bold" style={{ background: "#EDF1F6", color: C.faint }}>
                近日公開
              </span>
            </div>
          </div>

          {/* ③ 用語集 */}
          <div className="flex flex-col overflow-hidden rounded-[14px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[92px] items-center justify-center gap-2" style={{ background: C.goodSoft }}>
              {["あ", "か", "さ"].map((k) => (
                <span key={k} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white text-[13px] font-bold" style={{ color: "#0F6E56" }}>
                  {k}
                </span>
              ))}
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full" style={{ background: C.good }}>
                <Search className="h-4 w-4 text-white" />
              </span>
            </div>
            <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
              <div className="text-[15.5px] font-bold">用語集</div>
              <div className="mt-1.5">
                <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "#EDF1F6", color: C.muted }}>準備中</span>
              </div>
              <p className="mb-3 mt-2 flex-1 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
                全用語を1ページに。五十音・検索・分野の絞り込みですぐ引けます。
              </p>
              <span className="block w-full rounded-[10px] py-2.5 text-center text-[13px] font-bold" style={{ background: "#EDF1F6", color: C.faint }}>
                近日公開
              </span>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px]" style={{ color: C.faint }}>
          「間違いの復習」と「用語集」は順次公開予定です。
        </p>
      </main>
    </div>
  );
}
