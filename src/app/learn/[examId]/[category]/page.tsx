"use client";

// 学習する：分野の「パス型学習」ページ（Brilliant風の縦の道筋）。
// /learn/[examId]/[category] … 道筋（ノード=小分類を最大8語ずつに分割したステップ）
// /learn/[examId]/[category]?step=N … ステップNの用語を学ぶ画面
// 進捗は localStorage（learnPathV1:exam:category）で管理し、上から順に解放する。

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { basicExams, displayCategory } from "@/lib/exams";
import { createSupabaseBrowserClient, fetchLearnTerms } from "@/lib/supabase-browser";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Loader2, Lock, Pencil, Play, Trophy } from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", line2: "#DDE3EC", brand: "#1D4ED8", brandDeep: "#163FB0", brandSoft: "#EAF0FE",
  good: "#0F8A5F",
};

type Term = { id: string; section: string; term: string; reading: string; body: string; sort_order: number };
type Step = { id: string; title: string; terms: Term[] };

const CHUNK = 8; // 1ステップの最大用語数

function buildSteps(terms: Term[]): Step[] {
  // sort_order 順を保ちつつ section ごとにまとめ、大きい section は約8語ずつに分割
  const groups: { section: string; terms: Term[] }[] = [];
  for (const t of terms) {
    const last = groups[groups.length - 1];
    if (last && last.section === t.section) last.terms.push(t);
    else groups.push({ section: t.section, terms: [t] });
  }
  const steps: Step[] = [];
  for (const g of groups) {
    const n = Math.ceil(g.terms.length / CHUNK);
    const size = Math.ceil(g.terms.length / n);
    for (let i = 0; i < n; i++) {
      const chunk = g.terms.slice(i * size, (i + 1) * size);
      if (chunk.length === 0) continue;
      steps.push({
        id: `${g.section}#${i}`,
        title: n > 1 ? `${g.section} ${i + 1}` : g.section,
        terms: chunk,
      });
    }
  }
  return steps;
}

function storageKey(examId: string, category: string) {
  return `learnPathV1:${examId}:${category}`;
}

function LearnPathContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params.examId as string;
  const category = decodeURIComponent((params.category as string) ?? "");
  const catLabel = displayCategory(examId, category);
  const exam = basicExams.find((e) => e.id === examId);

  const [terms, setTerms] = useState<Term[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<string[]>([]); // 完了ステップid
  const [pathWidth, setPathWidth] = useState(480);

  // この分野の用語（sort_order順）
  useEffect(() => {
    let on = true;
    setLoading(true);
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("learn_terms")
        .select("id, section, term, reading, body, sort_order")
        .eq("exam_id", examId)
        .eq("category", category)
        .order("sort_order");
      if (!on) return;
      setTerms((data as Term[]) ?? []);
      setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, [examId, category]);

  // 分野タブ用（試験内の分野一覧）
  useEffect(() => {
    let on = true;
    (async () => {
      const rows = await fetchLearnTerms<{ category: string; sort_order: number }>("category, sort_order", { examId });
      if (!on) return;
      const min = new Map<string, number>();
      for (const r of rows) {
        const cur = min.get(r.category);
        if (cur === undefined || r.sort_order < cur) min.set(r.category, r.sort_order);
      }
      setCats(Array.from(min.entries()).sort((a, b) => a[1] - b[1]).map(([c]) => c));
    })();
    return () => {
      on = false;
    };
  }, [examId]);

  // 進捗の読み込み
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(examId, category));
      setDone(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDone([]);
    }
  }, [examId, category]);

  // パス列の幅（線の描画用）
  useEffect(() => {
    const update = () => {
      const el = document.getElementById("learn-path-area");
      if (el) setPathWidth(el.clientWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [loading]);

  const steps = useMemo(() => buildSteps(terms), [terms]);
  const isDone = (id: string) => done.includes(id);
  const currentIdx = steps.findIndex((s) => !isDone(s.id)); // -1 = 全部完了
  const allDone = steps.length > 0 && currentIdx === -1;
  const doneCount = steps.filter((s) => isDone(s.id)).length;

  function markDone(id: string) {
    setDone((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try {
        localStorage.setItem(storageKey(examId, category), JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // ?step=N（1始まり）
  const stepParam = searchParams.get("step");
  const stepIdx = stepParam ? parseInt(stepParam, 10) - 1 : null;
  const unlocked = (i: number) => i === 0 || isDone(steps[i - 1]?.id);
  const studying = stepIdx !== null && stepIdx >= 0 && stepIdx < steps.length && unlocked(stepIdx) ? steps[stepIdx] : null;

  const basePath = `/learn/${examId}/${encodeURIComponent(category)}`;

  // ===== パスの座標 =====
  const GAP = 104; // ノード間の縦間隔
  const AMP = Math.min(88, Math.max(56, pathWidth / 2 - 150)); // 振れ幅（ラベル分を確保）
  const nodeXY = (i: number) => ({
    x: pathWidth / 2 + (i % 2 === 0 ? -AMP : AMP),
    y: 46 + i * GAP,
  });
  const goalXY = { x: pathWidth / 2 + (steps.length % 2 === 0 ? -AMP : AMP), y: 46 + steps.length * GAP };
  const pathHeight = goalXY.y + 70;

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 md:px-6">
          {studying ? (
            <Link href={basePath} aria-label="道筋に戻る" style={{ color: C.faint }} className="hover:opacity-70">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          ) : (
            <Link href={`/learn/${examId}/course`} aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          )}
          <div className="min-w-0">
            <div className="text-[13px]" style={{ color: C.muted }}>{exam ? `${exam.name}・順を追って学ぶ` : "順を追って学ぶ"}</div>
            <div className="truncate text-[17px] font-bold">{studying ? studying.title : catLabel}</div>
          </div>
          {studying && (
            <span className="ml-auto whitespace-nowrap text-[13px] font-bold" style={{ color: C.brandDeep }}>
              ステップ {stepIdx! + 1} / {steps.length}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 md:px-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: C.faint }}>
            <Loader2 className="h-5 w-5 animate-spin" /> 読み込み中…
          </div>
        ) : terms.length === 0 ? (
          <div className="rounded-2xl px-4 py-12 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <p className="text-[14px] font-bold">この分野の用語は準備中です</p>
            <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>順次追加していきます。</p>
          </div>
        ) : studying ? (
          /* ===== ステップ学習ビュー ===== */
          <div className="space-y-2.5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-[10px] flex-1 overflow-hidden rounded-full" style={{ background: "#E3E8F0" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${((stepIdx! + (isDone(studying.id) ? 1 : 0)) / steps.length) * 100}%`, background: C.brand }} />
              </div>
              <span className="text-[12.5px] font-bold" style={{ color: C.muted }}>{studying.terms.length}語</span>
            </div>

            {studying.terms.map((t) => (
              <div key={t.id} className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h3 className="text-[15.5px] font-bold">{t.term}</h3>
                  {t.reading && <span className="text-[11px]" style={{ color: C.faint }}>{t.reading}</span>}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "#3a4658" }}>{t.body}</p>
              </div>
            ))}

            <div className="pt-3">
              {isDone(studying.id) ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {stepIdx! + 1 < steps.length && (
                    <button
                      onClick={() => router.push(`${basePath}?step=${stepIdx! + 2}`)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                      style={{ background: C.brand }}
                    >
                      次のステップへ <ArrowRight className="h-5 w-5" />
                    </button>
                  )}
                  <Link
                    href={basePath}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold"
                    style={{ background: C.card, border: `1px solid ${C.line2}`, color: C.muted }}
                  >
                    道筋に戻る
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => {
                    markDone(studying.id);
                    if (stepIdx! + 1 < steps.length) router.push(`${basePath}?step=${stepIdx! + 2}`);
                    else router.push(basePath);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                  style={{ background: C.brand }}
                >
                  <Check className="h-5 w-5" />
                  このステップを完了{stepIdx! + 1 < steps.length ? "して次へ" : "する"}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ===== 道筋（パス）ビュー ===== */
          <div>
            {/* 分野タブ */}
            {cats.length > 1 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {cats.map((c) => {
                  const active = c === category;
                  return (
                    <Link
                      key={c}
                      href={`/learn/${examId}/${encodeURIComponent(c)}`}
                      className="whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-bold"
                      style={active ? { background: C.brand, color: "#fff" } : { background: "#EEF2F9", color: "#33415A" }}
                    >
                      {displayCategory(examId, c)}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* 進捗 */}
            <div className="rounded-2xl px-4 py-3.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: C.muted }}>順を追って学ぶ</span>
                <span className="text-[13px] font-bold" style={{ color: C.brandDeep }}>{doneCount} / {steps.length} 完了</span>
              </div>
              <div className="mt-2 h-[10px] overflow-hidden rounded-full" style={{ background: "#E3E8F0" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${steps.length ? (doneCount / steps.length) * 100 : 0}%`, background: C.brand }} />
              </div>
            </div>

            {allDone && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: "#ECF6F0", border: "1px solid #BFE4CE" }}>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white" style={{ background: C.good }}>
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[14.5px] font-bold" style={{ color: "#0F6E56" }}>お疲れ様でした！「{catLabel}」を学びきりました</div>
                  <div className="text-[12px]" style={{ color: "#3E7D62" }}>仕上げに、この分野の問題を解いて定着を確認しましょう。</div>
                </div>
              </div>
            )}

            {/* パス本体 */}
            <div id="learn-path-area" className="relative mx-auto mt-2 w-full max-w-[520px]" style={{ height: pathHeight }}>
              <svg width={pathWidth} height={pathHeight} className="absolute inset-0" aria-hidden="true">
                {steps.map((s, i) => {
                  const a = nodeXY(i);
                  const b = i + 1 < steps.length ? nodeXY(i + 1) : goalXY;
                  const solid = isDone(s.id);
                  return (
                    <line
                      key={s.id}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={solid ? C.brand : C.line2}
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeDasharray={solid ? undefined : "1 16"}
                    />
                  );
                })}
              </svg>

              {steps.map((s, i) => {
                const { x, y } = nodeXY(i);
                const completed = isDone(s.id);
                const isCurrent = i === currentIdx;
                const canOpen = completed || unlocked(i);
                const labelLeft = i % 2 === 1; // 右側ノードはラベルを左に
                const node = (
                  <>
                    {isCurrent && (
                      <span className="absolute rounded-full" style={{ left: x - 37, top: y - 37, width: 74, height: 74, background: C.brandSoft }} />
                    )}
                    <span
                      className="absolute flex items-center justify-center rounded-full"
                      style={{
                        left: x - 27, top: y - 27, width: 54, height: 54,
                        background: completed || isCurrent ? C.brand : "#EDF1F6",
                        border: isCurrent ? "3px solid #fff" : undefined,
                        boxShadow: isCurrent ? "0 4px 12px rgba(29,78,216,0.35)" : undefined,
                      }}
                    >
                      {completed ? (
                        <Check className="h-6 w-6 text-white" />
                      ) : isCurrent ? (
                        <Play className="h-6 w-6 text-white" />
                      ) : (
                        <Lock className="h-5 w-5" style={{ color: C.faint }} />
                      )}
                    </span>
                    {isCurrent && (
                      <span
                        className="absolute whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                        style={{ left: x - 26, top: y - 52, background: C.brand }}
                      >
                        今ここ
                      </span>
                    )}
                    <span
                      className="absolute"
                      style={{
                        top: y - 18,
                        ...(labelLeft
                          ? { right: pathWidth - x + 40, textAlign: "right" as const }
                          : { left: x + 40 }),
                        maxWidth: pathWidth / 2 - 60,
                      }}
                    >
                      <span className="block truncate text-[14.5px] font-bold leading-tight" style={{ color: canOpen ? C.ink : C.muted }}>
                        {s.title}
                      </span>
                      <span className="block text-[11.5px]" style={{ color: isCurrent ? C.brand : C.faint, fontWeight: isCurrent ? 700 : 400 }}>
                        {completed ? `完了 ・ ${s.terms.length}語` : isCurrent ? "いま学べる →" : `未開放 ・ ${s.terms.length}語`}
                      </span>
                    </span>
                  </>
                );
                return canOpen ? (
                  <Link key={s.id} href={`${basePath}?step=${i + 1}`} className="block transition-opacity hover:opacity-85">
                    {node}
                  </Link>
                ) : (
                  <div key={s.id}>{node}</div>
                );
              })}

              {/* ゴールノード */}
              <span
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  left: goalXY.x - 27, top: goalXY.y - 27, width: 54, height: 54,
                  background: allDone ? C.good : "#EDF1F6",
                  border: allDone ? undefined : `2px dashed ${C.line2}`,
                }}
              >
                <Trophy className="h-6 w-6" style={{ color: allDone ? "#fff" : C.faint }} />
              </span>
              <span
                className="absolute"
                style={{
                  top: goalXY.y - 18,
                  ...(steps.length % 2 === 1 ? { right: pathWidth - goalXY.x + 40, textAlign: "right" as const } : { left: goalXY.x + 40 }),
                  maxWidth: pathWidth / 2 - 60,
                }}
              >
                <span className="block text-[14.5px] font-bold leading-tight" style={{ color: allDone ? C.good : C.muted }}>
                  {catLabel} 総まとめ
                </span>
                <span className="block text-[11.5px]" style={{ color: C.faint }}>{allDone ? "達成！" : "ゴール"}</span>
              </span>
            </div>

            {/* 注記・演習CTA */}
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-1.5 rounded-xl p-3 text-[11.5px]" style={{ background: "#FBEADF", color: "#8a4a1f" }}>
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-none" />
                用語の選定はIPAシラバスの出題範囲と過去問の出題実績に基づき、解説はAIが作成しています。進捗はこの端末のブラウザに保存されます。
              </div>
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
          </div>
        )}
      </main>
    </div>
  );
}

export default function LearnCategoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#F5F7FA" }} />}>
      <LearnPathContent />
    </Suspense>
  );
}
