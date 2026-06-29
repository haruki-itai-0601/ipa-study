"use client";

// 学習する：試験ごとの「分野一覧」。learn_terms にある分野をカードで並べ、各分野の用語ページへ。
// /learn/[examId]

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { basicExams, displayCategory } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ArrowLeft, BookOpen, ChevronRight, Loader2 } from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", line2: "#DDE3EC", brand: "#1D4ED8", brandDeep: "#163FB0", brandSoft: "#EAF0FE",
};

export default function LearnExamPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = basicExams.find((e) => e.id === examId);

  const [cats, setCats] = useState<{ category: string; n: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("learn_terms").select("category").eq("exam_id", examId);
      if (!on) return;
      // 分野ごとに用語数を集計（sort_orderの最小で並べたいが、ここでは件数の多い順→名前順）
      const counts = new Map<string, number>();
      for (const r of (data as { category: string }[]) ?? []) {
        counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
      }
      setCats(Array.from(counts.entries()).map(([category, n]) => ({ category, n })).sort((a, b) => b.n - a.n));
      setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, [examId]);

  const hasContent = useMemo(() => cats.length > 0, [cats]);

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 md:px-6">
          <Link href="/" aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-[13px]" style={{ color: C.muted }}>学習する</div>
            <div className="truncate text-[17px] font-bold">{exam ? exam.name : "学習する"}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <div className="mb-5 flex items-start gap-3 rounded-2xl p-4" style={{ background: C.brandSoft, border: "1px solid #CFE0FB" }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white" style={{ background: C.brand }}>
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[15px] font-bold">分野ごとに、頻出用語・概念を学ぶ</div>
            <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>
              IPAシラバスの出題範囲に沿って整理しています。学びたい分野を選んでください。
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: C.faint }}>
            <Loader2 className="h-5 w-5 animate-spin" /> 読み込み中…
          </div>
        ) : !hasContent ? (
          <div className="rounded-2xl px-4 py-12 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <p className="text-[14px] font-bold">この試験の学習コンテンツは準備中です</p>
            <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>分野ごとの用語・概念を順次追加していきます。</p>
            <Link href="/" className="mt-3 inline-block text-[12.5px] font-bold" style={{ color: C.brand }}>ホームに戻る →</Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cats.map((c) => (
              <Link
                key={c.category}
                href={`/learn/${examId}/${encodeURIComponent(c.category)}`}
                className="flex items-center gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                style={{ background: C.card, border: `1px solid ${C.line}` }}
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: C.brandSoft, color: C.brandDeep }}>
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{displayCategory(examId, c.category)}</div>
                  <div className="text-[12px]" style={{ color: C.muted }}>用語・概念 {c.n}件</div>
                </div>
                <ChevronRight className="h-6 w-6 flex-none" style={{ color: C.faint }} />
              </Link>
            ))}
            <p className="pt-2 text-center text-[11px]" style={{ color: C.faint }}>
              他の分野も順次追加していきます。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
