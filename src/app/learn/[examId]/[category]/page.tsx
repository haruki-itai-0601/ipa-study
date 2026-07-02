"use client";

// 学習する：分野の「パス型学習」ページ（Brilliant風の縦の道筋）。
// /learn/[examId]/[category]?step=N
// - ステップ＝小分類（同じ小分類は全体でまとめてから最大8語ずつに分割。IDは小分類#連番で一意）
// - 道は長短・振れ幅に変化をつけた曲線（リアルな道感）。学習パネルは右側（モバイルは上）に表示し、
//   完了するたびに「今ここ」マーカーが道の上を滑って進む（CSSトランジション）。
// - 進捗は localStorage（learnPathV1:exam:category）で管理し、上から順に解放する。

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { basicExams, displayCategory, orderLearnCategories } from "@/lib/exams";
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

// 同じ小分類を全体でまとめて（初出順）、大きい小分類は約8語ずつに分割する。
// ※連続グループ化だと同名小分類が飛び飛びに複数グループになりIDが重複＝誤解放バグの原因になる。
function buildSteps(terms: Term[]): Step[] {
  const order: string[] = [];
  const bySection = new Map<string, Term[]>();
  for (const t of terms) {
    if (!bySection.has(t.section)) {
      bySection.set(t.section, []);
      order.push(t.section);
    }
    bySection.get(t.section)!.push(t);
  }
  const steps: Step[] = [];
  for (const section of order) {
    const list = bySection.get(section)!;
    const n = Math.ceil(list.length / CHUNK);
    const size = Math.ceil(list.length / n);
    for (let i = 0; i < n; i++) {
      const chunk = list.slice(i * size, (i + 1) * size);
      if (chunk.length === 0) continue;
      steps.push({ id: `${section}#${i}`, title: n > 1 ? `${section} ${i + 1}` : section, terms: chunk });
    }
  }
  return steps;
}

function storageKey(examId: string, category: string) {
  return `learnPathV1:${examId}:${category}`;
}

// 道の「揺らぎ」パターン（決め打ち＝リロードしても同じ道になる）
const XP = [-1, -0.3, 0.72, 1, 0.18, -0.62, -1, -0.1, 0.88, 0.4, -0.52, -0.95, 0.05, 0.8, -0.35, 0.6];
const YG = [1, 1.32, 0.86, 1.18, 1.5, 0.9, 1.22, 1.02, 1.38, 0.82, 1.12, 1.45, 0.95, 1.25];

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
  const [done, setDone] = useState<string[]>([]);
  const [pathWidth, setPathWidth] = useState(420);

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

  useEffect(() => {
    let on = true;
    (async () => {
      const rows = await fetchLearnTerms<{ category: string }>("category", { examId });
      if (!on) return;
      const uniq = Array.from(new Set(rows.map((r) => r.category)));
      setCats(orderLearnCategories(examId, uniq));
    })();
    return () => {
      on = false;
    };
  }, [examId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(examId, category));
      setDone(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDone([]);
    }
  }, [examId, category]);

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
  const currentIdx = steps.findIndex((s) => !isDone(s.id)); // -1 = 全完了
  const allDone = steps.length > 0 && currentIdx === -1;
  const doneCount = steps.filter((s) => isDone(s.id)).length;
  const unlocked = (i: number) => i === 0 || isDone(steps[i - 1]?.id);

  function markDone(id: string) {
    setDone((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try {
        localStorage.setItem(storageKey(examId, category), JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const basePath = `/learn/${examId}/${encodeURIComponent(category)}`;

  // 選択中ステップ（?step=N。未指定なら「今ここ」を自動選択）
  const stepParam = searchParams.get("step");
  let stepIdx: number | null = stepParam ? parseInt(stepParam, 10) - 1 : currentIdx >= 0 ? currentIdx : null;
  if (stepIdx !== null && (stepIdx < 0 || stepIdx >= steps.length || !unlocked(stepIdx))) {
    stepIdx = currentIdx >= 0 ? currentIdx : null;
  }
  const selected = stepIdx !== null ? steps[stepIdx] : null;

  // モバイルではノード選択時にパネルへスクロール
  useEffect(() => {
    if (stepParam && typeof window !== "undefined" && window.innerWidth < 768) {
      document.getElementById("learn-step-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [stepParam]);

  // ===== 道の座標（揺らぎつき） =====
  const AMP = Math.min(92, Math.max(46, pathWidth / 2 - 128));
  const BASE_GAP = 100;
  const ys = useMemo(() => {
    const arr: number[] = [];
    let y = 52;
    for (let i = 0; i <= steps.length; i++) {
      arr.push(y);
      y += BASE_GAP * YG[i % YG.length];
    }
    return arr;
  }, [steps.length]);
  const xAt = (i: number) => pathWidth / 2 + XP[i % XP.length] * AMP;
  const nodeXY = (i: number) => ({ x: xAt(i), y: ys[i] });
  const goalXY = { x: xAt(steps.length), y: ys[steps.length] };
  const pathHeight = goalXY.y + 72;
  const avatarPos = allDone ? goalXY : currentIdx >= 0 ? nodeXY(currentIdx) : null;

  // S字カーブの道（縦方向に接線をもつ3次ベジェ）
  const roadD = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dy = (b.y - a.y) * 0.55;
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
  };

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 md:px-6">
          <Link href={`/learn/${examId}/course`} aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-[13px]" style={{ color: C.muted }}>{exam ? `${exam.name}・順を追って学ぶ` : "順を追って学ぶ"}</div>
            <div className="truncate text-[17px] font-bold">{catLabel}</div>
          </div>
          <span className="ml-auto whitespace-nowrap text-[13px] font-bold" style={{ color: C.brandDeep }}>
            {doneCount} / {steps.length} 完了
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 md:px-6">
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
          <>
            {/* 分野タブ＋進捗（全幅） */}
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

            <div className="rounded-2xl px-4 py-3.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: C.muted }}>順を追って学ぶ</span>
                <span className="text-[13px] font-bold" style={{ color: C.brandDeep }}>{doneCount} / {steps.length} 完了</span>
              </div>
              <div className="mt-2 h-[10px] overflow-hidden rounded-full" style={{ background: "#E3E8F0" }}>
                <div className="h-full rounded-full" style={{ width: `${steps.length ? (doneCount / steps.length) * 100 : 0}%`, background: C.brand, transition: "width .6s ease" }} />
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

            {/* 道（左）＋学習パネル（右） */}
            <div className="mt-4 flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start md:gap-6">
              {/* 学習パネル（モバイルでは上） */}
              <div id="learn-step-panel" className="order-1 md:sticky md:top-[84px] md:order-2 md:max-h-[calc(100vh-108px)] md:overflow-y-auto">
                {selected ? (
                  <div className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-[16.5px] font-bold">{selected.title}</h2>
                      <span className="whitespace-nowrap text-[12px] font-bold" style={{ color: C.muted }}>
                        ステップ {stepIdx! + 1}/{steps.length} ・ {selected.terms.length}語
                      </span>
                    </div>
                    {isDone(selected.id) && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "#ECF6F0", color: C.good }}>
                        <Check className="h-3.5 w-3.5" /> 完了済み（復習）
                      </span>
                    )}
                    <div className="mt-3 space-y-2.5">
                      {selected.terms.map((t) => (
                        <div key={t.id} className="rounded-xl p-3.5" style={{ background: C.bg, border: `1px solid ${C.line}` }}>
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <h3 className="text-[15px] font-bold">{t.term}</h3>
                            {t.reading && <span className="text-[11px]" style={{ color: C.faint }}>{t.reading}</span>}
                          </div>
                          <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: "#3a4658" }}>{t.body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      {isDone(selected.id) ? (
                        stepIdx! + 1 < steps.length ? (
                          <button
                            onClick={() => router.replace(`${basePath}?step=${stepIdx! + 2}`, { scroll: false })}
                            className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                            style={{ background: C.brand }}
                          >
                            次のステップへ <ArrowRight className="h-5 w-5" />
                          </button>
                        ) : null
                      ) : (
                        <button
                          onClick={() => {
                            markDone(selected.id);
                            if (stepIdx! + 1 < steps.length) router.replace(`${basePath}?step=${stepIdx! + 2}`, { scroll: false });
                            else router.replace(basePath, { scroll: false });
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                          style={{ background: C.brand }}
                        >
                          <Check className="h-5 w-5" />
                          このステップを完了{stepIdx! + 1 < steps.length ? "して進む" : "する"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-6 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                    <Trophy className="mx-auto h-8 w-8" style={{ color: C.good }} />
                    <p className="mt-2 text-[15px] font-bold">全ステップ完了です！</p>
                    <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>道筋のノードを押すと、いつでも復習できます。</p>
                  </div>
                )}
              </div>

              {/* 道 */}
              <div className="order-2 md:order-1">
                <div id="learn-path-area" className="relative w-full" style={{ height: pathHeight }}>
                  <svg width={pathWidth} height={pathHeight} className="absolute inset-0" aria-hidden="true">
                    {steps.map((s, i) => {
                      const a = nodeXY(i);
                      const b = i + 1 < steps.length ? nodeXY(i + 1) : goalXY;
                      const solid = isDone(s.id);
                      return (
                        <path
                          key={s.id}
                          d={roadD(a, b)}
                          fill="none"
                          strokeWidth={10}
                          strokeLinecap="round"
                          strokeDasharray={solid ? undefined : "0.5 16"}
                          style={{ stroke: solid ? C.brand : C.line2, transition: "stroke .5s ease" }}
                        />
                      );
                    })}
                  </svg>

                  {/* 進むマーカー（ハロー＋今ここ）＝位置がCSSトランジションで滑る */}
                  {avatarPos && !allDone && (
                    <>
                      <span
                        className="absolute rounded-full"
                        style={{ left: avatarPos.x - 37, top: avatarPos.y - 37, width: 74, height: 74, background: C.brandSoft, transition: "left .7s ease, top .7s ease" }}
                      />
                      <span
                        className="absolute whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                        style={{ left: avatarPos.x - 26, top: avatarPos.y - 54, background: C.brand, transition: "left .7s ease, top .7s ease" }}
                      >
                        今ここ
                      </span>
                    </>
                  )}

                  {steps.map((s, i) => {
                    const { x, y } = nodeXY(i);
                    const completed = isDone(s.id);
                    const isCurrent = i === currentIdx;
                    const isSelected = i === stepIdx;
                    const canOpen = completed || unlocked(i);
                    const labelLeft = x >= pathWidth / 2;
                    const node = (
                      <>
                        <span
                          className="absolute flex items-center justify-center rounded-full"
                          style={{
                            left: x - 26, top: y - 26, width: 52, height: 52,
                            background: completed || isCurrent ? C.brand : "#EDF1F6",
                            border: isSelected ? "3px solid #fff" : undefined,
                            boxShadow: isSelected ? "0 4px 14px rgba(29,78,216,0.4)" : undefined,
                            transition: "background .4s ease",
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
                        <span
                          className="absolute"
                          style={{
                            top: y - 18,
                            ...(labelLeft ? { right: pathWidth - x + 38, textAlign: "right" as const } : { left: x + 38 }),
                            maxWidth: (labelLeft ? x : pathWidth - x) - 46,
                          }}
                        >
                          <span className="block truncate text-[14px] font-bold leading-tight" style={{ color: canOpen ? C.ink : C.muted }}>
                            {s.title}
                          </span>
                          <span className="block text-[11.5px]" style={{ color: isCurrent ? C.brand : C.faint, fontWeight: isCurrent ? 700 : 400 }}>
                            {completed ? `完了 ・ ${s.terms.length}語` : isCurrent ? "いま学べる →" : `未開放 ・ ${s.terms.length}語`}
                          </span>
                        </span>
                      </>
                    );
                    return canOpen ? (
                      <Link key={s.id} href={`${basePath}?step=${i + 1}`} replace scroll={false} className="block transition-opacity hover:opacity-85">
                        {node}
                      </Link>
                    ) : (
                      <div key={s.id}>{node}</div>
                    );
                  })}

                  {/* ゴール */}
                  <span
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      left: goalXY.x - 26, top: goalXY.y - 26, width: 52, height: 52,
                      background: allDone ? C.good : "#EDF1F6",
                      border: allDone ? undefined : `2px dashed ${C.line2}`,
                      transition: "background .4s ease",
                    }}
                  >
                    <Trophy className="h-6 w-6" style={{ color: allDone ? "#fff" : C.faint }} />
                  </span>
                  <span
                    className="absolute"
                    style={{
                      top: goalXY.y - 18,
                      ...(goalXY.x >= pathWidth / 2 ? { right: pathWidth - goalXY.x + 38, textAlign: "right" as const } : { left: goalXY.x + 38 }),
                      maxWidth: (goalXY.x >= pathWidth / 2 ? goalXY.x : pathWidth - goalXY.x) - 46,
                    }}
                  >
                    <span className="block text-[14px] font-bold leading-tight" style={{ color: allDone ? C.good : C.muted }}>
                      {catLabel} 総まとめ
                    </span>
                    <span className="block text-[11.5px]" style={{ color: C.faint }}>{allDone ? "達成！" : "ゴール"}</span>
                  </span>
                </div>

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
            </div>
          </>
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
