"use client";

// 学習する > ステップで学習（学習→過去問演習）：試験ごとの「分野一覧」。learn_terms にある分野をカードで並べ、各分野の用語ページへ。
// /learn/[examId]/course

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { basicExams, displayCategory, learnCategoryGroups } from "@/lib/exams";
import { fetchLearnTerms } from "@/lib/supabase-browser";
import { ArrowLeft, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { MobileTabBar } from "@/components/mobile-tab-bar";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", line2: "#DDE3EC", brand: "#1D4ED8", brandDeep: "#163FB0", brandSoft: "#EAF0FE",
};

export default function LearnCoursePage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = basicExams.find((e) => e.id === examId);

  const [cats, setCats] = useState<{ category: string; n: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      const data = await fetchLearnTerms<{ category: string }>("category", { examId });
      if (!on) return;
      // 分野ごとに用語数を集計（sort_orderの最小で並べたいが、ここでは件数の多い順→名前順）
      const counts = new Map<string, number>();
      for (const r of data) {
        counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
      }
      setCats(Array.from(counts.entries()).map(([category, n]) => ({ category, n })));
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
          <Link href={`/learn/${examId}`} aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-[13px]" style={{ color: C.muted }}>{exam ? exam.name : "学習する"}</div>
            <div className="truncate text-[17px] font-bold">ステップで学習（学習 → 過去問演習）</div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 md:py-6">
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
            <Link href={`/learn/${examId}`} className="mt-3 inline-block text-[12.5px] font-bold" style={{ color: C.brand }}>学習するに戻る →</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              // IPAの3大区分（ストラテジ系/マネジメント系/テクノロジ系）でグループ表示。
              const byName = new Map(cats.map((c) => [c.category, c.n]));
              const groups = (learnCategoryGroups[examId] ?? [{ group: "", categories: cats.map((c) => c.category) }])
                .map((g) => ({ group: g.group, items: g.categories.filter((c) => byName.has(c)) }))
                .filter((g) => g.items.length > 0);
              const listed = new Set(groups.flatMap((g) => g.items));
              const rest = cats.map((c) => c.category).filter((c) => !listed.has(c));
              if (rest.length > 0) groups.push({ group: "その他", items: rest });
              return groups.map((g) => (
                <section key={g.group || "all"}>
                  {g.group && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-block h-4 w-1 rounded-full" style={{ background: C.brand }} />
                      <span className="text-[14.5px] font-bold">{g.group}</span>
                      <span className="text-[11.5px]" style={{ color: C.faint }}>
                        {g.items.reduce((s, c) => s + (byName.get(c) ?? 0), 0)}語
                      </span>
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {g.items.map((category) => (
                      <Link
                        key={category}
                        href={`/learn/${examId}/${encodeURIComponent(category)}`}
                        className="flex items-center gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                        style={{ background: C.card, border: `1px solid ${C.line}` }}
                      >
                        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: C.brandSoft, color: C.brandDeep }}>
                          <BookOpen className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold">{displayCategory(examId, category)}</div>
                          <div className="text-[12px]" style={{ color: C.muted }}>用語・概念 {byName.get(category)}件</div>
                        </div>
                        <ChevronRight className="h-6 w-6 flex-none" style={{ color: C.faint }} />
                      </Link>
                    ))}
                  </div>
                </section>
              ));
            })()}
            <p className="pt-2 text-center text-[11px]" style={{ color: C.faint }}>
              他の分野も順次追加していきます。
            </p>
          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
}
