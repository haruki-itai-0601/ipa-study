"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ArrowLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import FeBRunner, { type FeBQ } from "@/components/fe-b-runner";

const SOURCE_LABEL: Record<string, string> = {
  sample: "サンプル問題（全20問）",
  "2023r05": "令和5年度 公開問題",
  "2024r06": "令和6年度 公開問題",
  "2025r07": "令和7年度 公開問題",
};
const SOURCE_ORDER = ["sample", "2023r05", "2024r06", "2025r07"];

export default function KamokuBPage() {
  const params = useParams();
  const examId = params.examId as string;
  const [all, setAll] = useState<FeBQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("fe_b_questions")
        .select("id, source, q_number, category, options, correct, image_urls")
        .order("source")
        .order("q_number");
      if (on) {
        setAll((data as FeBQ[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  // 科目Bは基本情報(fe)専用
  if (examId !== "fe") return notFound();

  const sources = SOURCE_ORDER.filter((s) => all.some((q) => q.source === s));

  // 演習中
  if (activeSource) {
    const qs = all.filter((q) => q.source === activeSource).sort((a, b) => a.q_number - b.q_number);
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 md:px-8">
            <button onClick={() => setActiveSource(null)} className="text-gray-400 hover:text-gray-600" aria-label="戻る">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <div className="text-sm text-gray-500">基本情報 科目B</div>
              <div className="font-bold text-gray-900">{SOURCE_LABEL[activeSource] ?? activeSource}</div>
            </div>
          </div>
        </header>
        <FeBRunner questions={qs} sourceLabel={SOURCE_LABEL[activeSource]} />
      </div>
    );
  }

  // 出典選択
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 md:px-8">
          <Link href="/exam/fe" className="text-gray-400 hover:text-gray-600" aria-label="戻る">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <div className="text-sm text-gray-500">基本情報技術者試験</div>
            <div className="font-bold text-gray-900">科目B（プログラミング・情報セキュリティ）</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-8">
        <p className="text-sm leading-relaxed text-gray-600">
          科目B（旧・午後）は、擬似言語によるアルゴリズム＆プログラミングと情報セキュリティの多肢選択問題です。IPA公式のサンプル問題・公開問題で演習できます（無料・登録不要）。
        </p>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /> 読み込み中…
          </div>
        ) : sources.length === 0 ? (
          <div className="py-16 text-center text-gray-500">問題を準備中です。</div>
        ) : (
          <div className="space-y-3">
            {sources.map((s) => {
              const qs = all.filter((q) => q.source === s);
              const algo = qs.filter((q) => q.category === "algorithm").length;
              const sec = qs.filter((q) => q.category === "security").length;
              return (
                <button
                  key={s}
                  onClick={() => setActiveSource(s)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white/85 p-4 text-left shadow-rich transition-all duration-200 hover:-translate-y-0.5 hover:shadow-rich-lg"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{SOURCE_LABEL[s] ?? s}</div>
                    <div className="text-sm text-gray-500">
                      全{qs.length}問（アルゴリズム{algo}・セキュリティ{sec}）
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 flex-shrink-0 text-gray-400" />
                </button>
              );
            })}
          </div>
        )}

        <p className="pt-2 text-xs leading-relaxed text-gray-400">
          出典：IPA（独立行政法人情報処理推進機構）基本情報技術者試験 科目B サンプル問題・公開問題。
        </p>
      </main>
    </div>
  );
}
