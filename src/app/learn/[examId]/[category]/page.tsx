"use client";

// 学習する：分野の「パス型学習」ページ（BrilliantのQuantum Computingコース路線図を踏襲）。
// /learn/[examId]/[category]?step=N
// - 左＝学習パネル／右＝道（Brilliantと同配置）。モバイルはパネルが上。
// - ノード＝2段のアイソメトリック台座。道＝細い回路風ルート（水平→斜め→水平）で、
//   到達済み＝ブランド青・未到達＝薄グレー。小分類の切れ目にLEVELバッジ。背景に薄い配線飾り。
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
type Step = { id: string; title: string; section: string; terms: Term[] };

const CHUNK = 8; // 1ステップの最大用語数

// 同じ小分類を全体でまとめて（初出順）、大きい小分類は約8語ずつに分割する。
// ※連続グループ化だと同名小分類が飛び飛びで別グループになりIDが重複＝誤解放バグの原因になる。
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
      steps.push({ id: `${section}#${i}`, title: n > 1 ? `${section} ${i + 1}` : section, section, terms: chunk });
    }
  }
  return steps;
}

function storageKey(examId: string, category: string) {
  return `learnPathV1:${examId}:${category}`;
}

// 道の蛇行（Brilliantの路線図と同じく、同じ側に続いてから反対へ渡るループパターン。決め打ち）
const XP = [-0.72, 0.05, 0.78, 0.12, -0.65, 0.18];
const YG = [1, 1.04, 0.96, 1.08, 0.94, 1.02];

// 2段のアイソメトリック台座（Brilliantのレッスンノード風）。(x, y) が下段上面の中心。
function IsoPlatform({
  x, y, palette, selected, dimmed,
}: {
  x: number; y: number;
  palette: { baseTop: string; baseSide: string; topTop: string; topSide: string };
  selected?: boolean; dimmed?: boolean;
}) {
  const W = 66; // 下段の幅
  const T = 12; // 下段の厚み
  const w = 42; // 上段の幅
  const t = 9; // 上段の厚み
  const H = W / 2; // 下段上面ひし形の高さ
  const h = w / 2; // 上段上面ひし形の高さ
  const cx = W / 2;
  const baseCy = 26; // 下段上面中心（svg内）
  const topCy = baseCy - 8; // 上段上面中心（少し持ち上げ）
  return (
    <svg
      width={W}
      height={baseCy + H / 2 + T + 2}
      className="absolute"
      style={{
        left: x - cx,
        top: y - baseCy,
        filter: selected
          ? "drop-shadow(0 6px 14px rgba(29,78,216,0.45))"
          : "drop-shadow(0 3px 5px rgba(21,32,46,0.2))",
        opacity: dimmed ? 0.92 : 1,
      }}
      aria-hidden="true"
    >
      {/* 下段（側面→上面） */}
      <polygon points={`0,${baseCy} ${cx},${baseCy + H / 2} ${cx},${baseCy + H / 2 + T} 0,${baseCy + T}`} fill={palette.baseSide} style={{ transition: "fill .4s ease" }} />
      <polygon points={`${cx},${baseCy + H / 2} ${W},${baseCy} ${W},${baseCy + T} ${cx},${baseCy + H / 2 + T}`} fill={palette.baseSide} style={{ transition: "fill .4s ease", filter: "brightness(0.88)" }} />
      <polygon points={`${cx},${baseCy - H / 2} ${W},${baseCy} ${cx},${baseCy + H / 2} 0,${baseCy}`} fill={palette.baseTop} style={{ transition: "fill .4s ease" }} />
      {/* 上段（側面→上面） */}
      <polygon points={`${cx - w / 2},${topCy} ${cx},${topCy + h / 2} ${cx},${topCy + h / 2 + t} ${cx - w / 2},${topCy + t}`} fill={palette.topSide} style={{ transition: "fill .4s ease" }} />
      <polygon points={`${cx},${topCy + h / 2} ${cx + w / 2},${topCy} ${cx + w / 2},${topCy + t} ${cx},${topCy + h / 2 + t}`} fill={palette.topSide} style={{ transition: "fill .4s ease", filter: "brightness(0.88)" }} />
      <polygon
        points={`${cx},${topCy - h / 2} ${cx + w / 2},${topCy} ${cx},${topCy + h / 2} ${cx - w / 2},${topCy}`}
        fill={palette.topTop}
        stroke={selected ? "#fff" : "transparent"}
        strokeWidth={selected ? 2 : 0}
        strokeLinejoin="round"
        style={{ transition: "fill .4s ease" }}
      />
    </svg>
  );
}

// 台座の配色（下段上面/下段側面/上段上面/上段側面）
const PLAT = {
  done: { baseTop: "#1D4ED8", baseSide: "#12318F", topTop: "#5B84F5", topSide: "#2F5CD9" },
  locked: { baseTop: "#565D68", baseSide: "#3E434C", topTop: "#8B93A0", topSide: "#6A7280" },
  goal: { baseTop: "#0F8A5F", baseSide: "#0A6B4A", topTop: "#3DB98A", topSide: "#178F66" },
};

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
  const [pathWidth, setPathWidth] = useState(460);

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

  useEffect(() => {
    if (stepParam && typeof window !== "undefined" && window.innerWidth < 768) {
      document.getElementById("learn-step-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [stepParam]);

  // ===== 道の座標 =====
  const AMP = Math.min(150, Math.max(58, pathWidth / 2 - 92));
  const BASE_GAP = 138; // ラベルをノード下に置くため広め
  const ys = useMemo(() => {
    const arr: number[] = [];
    let y = 112;
    for (let i = 0; i <= steps.length; i++) {
      arr.push(y);
      y += BASE_GAP * YG[i % YG.length];
    }
    return arr;
  }, [steps.length]);
  const xAt = (i: number) => pathWidth / 2 + XP[i % XP.length] * AMP;
  const nodeXY = (i: number) => ({ x: xAt(i), y: ys[i] });
  const goalXY = { x: xAt(steps.length), y: ys[steps.length] };
  const pathHeight = goalXY.y + 96;
  const avatarPos = allDone ? goalXY : currentIdx >= 0 ? nodeXY(currentIdx) : null;

  // 道＝水平→斜め→水平の回路風ルート（Brilliantの路線図と同じ挙動。
  // 横移動が小さい区間は一度反対側へ張り出してから斜めで渡る）
  const roadD = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dy = b.y - a.y;
    const dx = b.x - a.x;
    const run = Math.min(dy * 2, Math.max(140, pathWidth * 0.58)); // 斜め区間の水平距離（傾き≒0.5）
    const dir = dx >= 0 ? 1 : -1;
    const h1 = (dx - dir * run) / 2;
    const x1 = a.x + h1;
    const x2 = x1 + dir * run;
    return `M ${a.x} ${a.y} L ${x1} ${a.y} L ${x2} ${b.y} L ${b.x} ${b.y}`;
  };

  // LEVELバッジ（小分類の切れ目）
  const badges = useMemo(() => {
    const list: { i: number; level: number }[] = [];
    let prev = "";
    steps.forEach((s, i) => {
      if (s.section !== prev) {
        list.push({ i, level: list.length + 1 });
        prev = s.section;
      }
    });
    return list;
  }, [steps]);

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

            {/* 学習パネル（左）＋道（右）＝Brilliantと同配置。モバイルはパネルが上 */}
            <div className="mt-4 flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-6">
              {/* 学習パネル */}
              <div id="learn-step-panel" className="md:sticky md:top-[84px] md:max-h-[calc(100vh-108px)] md:overflow-y-auto">
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
              <div>
                <div id="learn-path-area" className="relative w-full" style={{ height: pathHeight }}>
                  <svg width={pathWidth} height={pathHeight} className="absolute inset-0" aria-hidden="true">
                    {/* 背景の配線飾り（Brilliantの薄い回路模様） */}
                    <g fill="none" stroke="#E9EDF5" strokeWidth={2}>
                      {Array.from({ length: Math.max(1, Math.ceil(pathHeight / 560)) }, (_, k) => (
                        <g key={k}>
                          <path d={`M ${pathWidth - 8} ${k * 560 + 60} h -44 l -24 12 h -38`} />
                          <circle cx={pathWidth - 116} cy={k * 560 + 72} r={3.5} fill="#E9EDF5" stroke="none" />
                          <path d={`M 8 ${k * 560 + 330} h 40 l 24 -12 h 36`} />
                          <circle cx={110} cy={k * 560 + 318} r={3.5} fill="#E9EDF5" stroke="none" />
                        </g>
                      ))}
                    </g>
                    {/* 道 */}
                    {steps.map((s, i) => {
                      const a = nodeXY(i);
                      const b = i + 1 < steps.length ? nodeXY(i + 1) : goalXY;
                      const solid = isDone(s.id);
                      return (
                        <path
                          key={s.id}
                          d={roadD(a, b)}
                          fill="none"
                          strokeWidth={solid ? 6 : 5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ stroke: solid ? C.brand : "#E1E6EF", transition: "stroke .5s ease" }}
                        />
                      );
                    })}
                  </svg>

                  {/* 進むマーカー（光＋今ここ）＝位置がCSSトランジションで滑る */}
                  {avatarPos && !allDone && (
                    <>
                      <span
                        className="absolute rounded-full"
                        style={{ left: avatarPos.x - 40, top: avatarPos.y - 40, width: 80, height: 80, background: C.brand, opacity: 0.13, filter: "blur(10px)", transition: "left .7s ease, top .7s ease" }}
                      />
                      <span
                        className="absolute whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                        style={{ left: avatarPos.x - 26, top: avatarPos.y - 62, background: C.brand, transition: "left .7s ease, top .7s ease" }}
                      >
                        今ここ
                      </span>
                    </>
                  )}

                  {/* LEVELバッジ（小分類の切れ目） */}
                  {badges.map((bd) => {
                    if (bd.i === currentIdx) return null; // 今ここピルと重なるため現在ノードのバッジは出さない
                    const here = nodeXY(bd.i);
                    const pos = { x: here.x, y: here.y - 66 };
                    const reached = unlocked(bd.i);
                    return (
                      <span key={bd.i} className="absolute" style={{ left: pos.x - 30, top: pos.y - 30, width: 60 }}>
                        <span className="block text-center text-[9px] font-bold tracking-widest" style={{ color: reached ? C.brand : "#AAB4C3" }}>LEVEL</span>
                        <span
                          className="mx-auto mt-0.5 flex h-[30px] w-[30px] rotate-45 items-center justify-center rounded-[7px]"
                          style={{ background: reached ? C.brand : "#D9DFE9", border: "2.5px solid #fff", boxShadow: "0 2px 6px rgba(21,32,46,0.15)", transition: "background .4s ease" }}
                        >
                          <span className="-rotate-45 text-[12.5px] font-bold" style={{ color: reached ? "#fff" : "#8E99A9" }}>{bd.level}</span>
                        </span>
                      </span>
                    );
                  })}

                  {steps.map((s, i) => {
                    const { x, y } = nodeXY(i);
                    const completed = isDone(s.id);
                    const isCurrent = i === currentIdx;
                    const isSelected = i === stepIdx;
                    const canOpen = completed || unlocked(i);
                    const node = (
                      <>
                        <IsoPlatform x={x} y={y} palette={completed || isCurrent ? PLAT.done : PLAT.locked} selected={isSelected} dimmed={!canOpen} />
                        <span className="absolute flex items-center justify-center" style={{ left: x - 10, top: y - 22, width: 20, height: 20 }}>
                          {completed ? (
                            <Check className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                          ) : isCurrent ? (
                            <Play className="text-white" style={{ width: 17, height: 17 }} />
                          ) : (
                            <Lock style={{ width: 15, height: 15, color: "#D4DAE3" }} />
                          )}
                        </span>
                        {/* ラベル＝ノードの真下・中央（Brilliant式）。道が透けないよう背景プレート付き */}
                        <span className="absolute flex justify-center" style={{ left: x - 90, top: y + 30, width: 180 }}>
                          <span className="rounded-lg px-1.5 py-0.5 text-center" style={{ background: "rgba(245,247,250,0.94)" }}>
                            <span className="block text-[13.5px] font-bold leading-tight" style={{ color: canOpen ? C.ink : C.muted }}>
                              {s.title}
                            </span>
                            <span className="block text-[11px]" style={{ color: isCurrent ? C.brand : C.faint, fontWeight: isCurrent ? 700 : 400 }}>
                              {completed ? `完了 ・ ${s.terms.length}語` : isCurrent ? "いま学べる →" : `未開放 ・ ${s.terms.length}語`}
                            </span>
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
                  <IsoPlatform x={goalXY.x} y={goalXY.y} palette={allDone ? PLAT.goal : PLAT.locked} />
                  <span className="absolute flex items-center justify-center" style={{ left: goalXY.x - 10, top: goalXY.y - 22, width: 20, height: 20 }}>
                    <Trophy style={{ width: 16, height: 16, color: allDone ? "#fff" : "#D4DAE3" }} />
                  </span>
                  <span className="absolute flex justify-center" style={{ left: goalXY.x - 90, top: goalXY.y + 30, width: 180 }}>
                    <span className="rounded-lg px-1.5 py-0.5 text-center" style={{ background: "rgba(245,247,250,0.94)" }}>
                      <span className="block text-[13.5px] font-bold leading-tight" style={{ color: allDone ? C.good : C.muted }}>
                        {catLabel} 総まとめ
                      </span>
                      <span className="block text-[11px]" style={{ color: C.faint }}>{allDone ? "達成！" : "ゴール"}</span>
                    </span>
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
