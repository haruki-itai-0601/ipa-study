"use client";

// 学習する：分野ごとの用語・概念ページ（IPAシラバスの用語例を土台にAIが解説）。
// /learn/[examId]/[category]。learn_terms から読み込み、section で小見出しグループ表示。

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { basicExams, displayCategory } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ArrowLeft, BookOpen, Lightbulb, Loader2, ArrowRight, Pencil } from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", line2: "#DDE3EC", brand: "#1D4ED8", brandDeep: "#163FB0", brandSoft: "#EAF0FE",
};

type Term = { id: string; section: string; term: string; reading: string; body: string; sort_order: number };

export default function LearnCategoryPage() {
  const params = useParams();
  const examId = params.examId as string;
  const category = decodeURIComponent((params.category as string) ?? "");
  const catLabel = displayCategory(examId, category); // 表示用（IPは情報デザイン等）。URL/クエリは category(データ値)のまま
  const exam = basicExams.find((e) => e.id === examId);

  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("learn_terms")
        .select("id, section, term, reading, body, sort_order")
        .eq("exam_id", examId)
        .eq("category", category)
        .order("sort_order");
      if (on) {
        setTerms((data as Term[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [examId, category]);

  // section ごとにグループ化（sort_order 順を保持）
  const groups = useMemo(() => {
    const map = new Map<string, Term[]>();
    for (const t of terms) {
      if (!map.has(t.section)) map.set(t.section, []);
      map.get(t.section)!.push(t);
    }
    return Array.from(map.entries());
  }, [terms]);

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      {/* header */}
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 md:px-6">
          <Link href="/" aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-[13px]" style={{ color: C.muted }}>{exam ? `${exam.name}・学習する` : "学習する"}</div>
            <div className="truncate text-[17px] font-bold">{catLabel}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        {/* intro */}
        <div className="mb-5 flex items-start gap-3 rounded-2xl p-4" style={{ background: C.brandSoft, border: "1px solid #CFE0FB" }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white" style={{ background: C.brand }}>
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[15px] font-bold">この分野の「頻出用語・概念」を学ぶ</div>
            <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>
              IPAシラバスの出題範囲（用語例）に沿って、重要用語をまとめました。まず用語に親しんでから問題を解くと定着が早いです。
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: C.faint }}>
            <Loader2 className="h-5 w-5 animate-spin" /> 読み込み中…
          </div>
        ) : terms.length === 0 ? (
          <div className="rounded-2xl px-4 py-12 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <p className="text-[14px] font-bold">この分野の用語は準備中です</p>
            <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>順次追加していきます。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([section, list]) => (
              <section key={section}>
                {section && (
                  <div className="mb-2 flex items-center gap-2 text-[14px] font-bold">
                    <span className="inline-block h-4 w-1 rounded-full" style={{ background: C.brand }} />
                    {section}
                  </div>
                )}
                <div className="space-y-2.5">
                  {list.map((t) => (
                    <div key={t.id} className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h3 className="text-[15px] font-bold">{t.term}</h3>
                        {t.reading && (
                          <span className="text-[11px]" style={{ color: C.faint }}>{t.reading}</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "#3a4658" }}>{t.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* AI注記 */}
            <div className="flex items-start gap-1.5 rounded-xl p-3 text-[11.5px]" style={{ background: "#FBEADF", color: "#8a4a1f" }}>
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-none" />
              用語の選定はIPAシラバスの出題範囲に基づき、解説はAIが作成しています。公式解説ではないため参考程度にご利用ください。
            </div>

            {/* この分野を解く */}
            <Link
              href={`/exam/${examId}/past?mode=category&category=${encodeURIComponent(category)}`}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
              style={{ background: C.brand }}
            >
              <Pencil className="h-5 w-5" />
              「{catLabel}」の問題を解いて確認する
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
