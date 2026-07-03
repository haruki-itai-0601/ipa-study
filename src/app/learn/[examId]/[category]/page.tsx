"use client";

// 学習する：分野の「パス型学習」ページ（Brilliant「100 Days of Puzzles」の路線図を踏襲）。
// /learn/[examId]/[category]?step=N
// - 左＝学習パネル／右＝道。モバイルはパネルが上。
// - 道＝左右に折り返しながら下る「1本のジグザグ山道」。ノード（LEVELバッジ含む）はその道の上に載せる。
//   レグ（片方向の下り）内はxが単調なので線どうしは絶対に交差しない。角は丸める。
//   LEVELバッジの直後だけ一度「登って」から下る峠を挟み、上下のうねりを作る。到達済み＝青／未到達＝薄グレー。
// - ノード＝2段のアイソメトリック台座。ラベルはノード真下（出線と反対側に少しずらす）。
// - 進捗は localStorage（learnPathV1:exam:category）で管理し、上から順に解放する。

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { basicExams, displayCategory, orderLearnCategories, questionSource } from "@/lib/exams";
import { createSupabaseBrowserClient, fetchLearnTerms } from "@/lib/supabase-browser";
import { ArrowLeft, ArrowRight, Check, CheckCircle, Lightbulb, Loader2, Lock, Pencil, Play, Trophy, XCircle } from "lucide-react";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { type Question } from "@/components/quiz-runner";
import ZoomableImage from "@/components/zoomable-image";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", line2: "#DDE3EC", brand: "#1D4ED8", brandDeep: "#163FB0", brandSoft: "#EAF0FE",
  good: "#0F8A5F",
};

type Term = { id: string; section: string; term: string; reading: string; body: string; sort_order: number };
type Step = { id: string; title: string; section: string; terms: Term[] };

const CHUNK = 8; // 1ステップの最大用語数
const CHECK_N = 3; // チェック問題の出題数（プールが少なければその数だけ）
const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };
const passNeed = (n: number) => Math.ceil((n * 2) / 3); // 合格ライン（3問なら2問）
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

// 同じ小分類を全体でまとめて（初出順）、大きい小分類は約8語ずつに分割する。
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

// チェーン上のアイテム（LEVELバッジも道の上に直列に並ぶ）
type ChainItem =
  | { type: "badge"; level: number; stepIdx: number } // stepIdx = このバッジの直後のステップ
  | { type: "step"; stepIdx: number }
  | { type: "goal" };

// 2段のアイソメトリック台座（Brilliantのレッスンノード風）。(x, y) が下段上面の中心。
function IsoPlatform({
  x, y, palette, selected, dimmed,
}: {
  x: number; y: number;
  palette: { baseTop: string; baseSide: string; topTop: string; topSide: string };
  selected?: boolean; dimmed?: boolean;
}) {
  const W = 62;
  const T = 11;
  const w = 40;
  const t = 8;
  const H = W / 2;
  const h = w / 2;
  const cx = W / 2;
  const baseCy = 25;
  const topCy = baseCy - 7;
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
      <polygon points={`0,${baseCy} ${cx},${baseCy + H / 2} ${cx},${baseCy + H / 2 + T} 0,${baseCy + T}`} fill={palette.baseSide} style={{ transition: "fill .4s ease" }} />
      <polygon points={`${cx},${baseCy + H / 2} ${W},${baseCy} ${W},${baseCy + T} ${cx},${baseCy + H / 2 + T}`} fill={palette.baseSide} style={{ transition: "fill .4s ease", filter: "brightness(0.88)" }} />
      <polygon points={`${cx},${baseCy - H / 2} ${W},${baseCy} ${cx},${baseCy + H / 2} 0,${baseCy}`} fill={palette.baseTop} style={{ transition: "fill .4s ease" }} />
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

  // チェック問題（小分類ごとの関連過去問プール＝learn_section_questionsから取得）
  const [pools, setPools] = useState<Map<string, string[]>>(new Map());
  const [panelPhase, setPanelPhase] = useState<"learn" | "check">("learn");
  const [checkQs, setCheckQs] = useState<Question[]>([]);
  const [checkIdx, setCheckIdx] = useState(0);
  const [checkSel, setCheckSel] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<boolean[]>([]);
  const [checkLoading, setCheckLoading] = useState(false);

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

  // チェック問題プール（小分類 → 関連過去問ID・関連度順）を取得
  useEffect(() => {
    let on = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("learn_section_questions")
        .select("section, question_id, score")
        .eq("exam_id", examId)
        .eq("category", category)
        .order("score", { ascending: false });
      if (!on) return;
      const map = new Map<string, string[]>();
      for (const r of (data ?? []) as { section: string; question_id: string }[]) {
        if (!map.has(r.section)) map.set(r.section, []);
        map.get(r.section)!.push(r.question_id);
      }
      setPools(map);
    })();
    return () => {
      on = false;
    };
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
  const cur = currentIdx === -1 ? steps.length : currentIdx; // 進捗の到達位置（step基準）
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

  // ===== チェック問題（学ぶ→即解く。合格で次のステップが開く） =====
  // 選択ステップが変わったら学習フェーズに戻す
  useEffect(() => {
    setPanelPhase("learn");
    setCheckQs([]);
    setCheckIdx(0);
    setCheckSel(null);
    setCheckResults([]);
  }, [stepIdx]);

  async function startCheck(step: Step, idx: number) {
    // 合格でcurrentIdxが進んでも結果画面が飛ばないよう、URLをこのステップに固定する
    router.replace(`${basePath}?step=${idx + 1}`, { scroll: false });
    const pool = pools.get(step.section) ?? [];
    const pick = shuffle(pool).slice(0, CHECK_N);
    setPanelPhase("check");
    setCheckLoading(true);
    setCheckIdx(0);
    setCheckSel(null);
    setCheckResults([]);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("questions").select("*").in("id", pick);
    const byId = new Map(((data ?? []) as Question[]).map((q) => [q.id, q]));
    setCheckQs(pick.map((id) => byId.get(id)).filter(Boolean) as Question[]);
    setCheckLoading(false);
  }

  async function answerCheck(key: string) {
    const q = checkQs[checkIdx];
    if (!q || checkSel) return;
    setCheckSel(key);
    const correct = key === q.correct_answer;
    setCheckResults((prev) => [...prev, correct]);
    // 解答は演習と同じく記録する（間違えれば「間違いの復習」にも貯まる）
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_progress").insert({
          user_id: user.id,
          question_id: q.id,
          exam_id: examId,
          year: q.year,
          is_correct: correct,
        });
      }
    } catch {}
  }

  const checkFinished = panelPhase === "check" && checkQs.length > 0 && checkResults.length === checkQs.length && checkSel === null;
  const checkCorrectCount = checkResults.filter(Boolean).length;
  const checkPassed = checkFinished && checkCorrectCount >= passNeed(checkQs.length);

  function nextCheck() {
    if (checkIdx + 1 < checkQs.length) {
      setCheckIdx((i) => i + 1);
    }
    setCheckSel(null); // 最終問のときは checkSel を外して結果画面へ
  }

  // 合格したらステップを完了にする（道のクリスタルが次へ進む）
  useEffect(() => {
    if (checkPassed && selected && !isDone(selected.id)) markDone(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkPassed]);

  // ===== チェーン（バッジ＋ステップ＋ゴールを直列に） =====
  const chain = useMemo(() => {
    const items: ChainItem[] = [];
    let prevSection = "";
    let level = 0;
    steps.forEach((s, i) => {
      if (s.section !== prevSection) {
        level += 1;
        items.push({ type: "badge", level, stepIdx: i });
        prevSection = s.section;
      }
      items.push({ type: "step", stepIdx: i });
    });
    items.push({ type: "goal" });
    return items;
  }, [steps]);

  // ===== 道のレイアウト（1本のジグザグ山道にノードを載せる） =====
  const SLOPE = 0.6; // 道の傾き（本家のiso風）
  const layout = useMemo(() => {
    const m = 44; // ノードを置ける範囲の外側マージン
    const usable = Math.max(160, pathWidth - m * 2);
    const narrow = pathWidth < 480;
    // レグ（片方向の下り区間）ごとのノード位置＝進行方向順の割合。狭い画面は1レグ1ノード。
    const LEGS: number[][] = narrow
      ? [[0.42], [0.55], [0.6], [0.38]]
      : [[0.36, 0.74], [0.56, 0.16], [0.28, 0.66], [0.5, 0.1]];
    const xAt = (f: number) => m + f * usable;

    const nodes: { x: number; y: number }[] = [];
    const exitSign: number[] = [];
    const links: { x: number; y: number }[][] = [];

    let leg = 0; // 偶数=右向き、奇数=左向き
    let slot = 1; // レグ内で次に使うノード枠
    let cx = xAt(LEGS[0][0]);
    let cy = 64;
    nodes.push({ x: cx, y: cy });

    for (let k = 1; k < chain.length; k++) {
      const pts: { x: number; y: number }[] = [{ x: cx, y: cy }];
      exitSign.push(leg % 2 === 0 ? 1 : -1);
      const wantRise = chain[k - 1].type === "badge"; // バッジ直後は峠（登り→下り）
      let viaCorner = false;
      if (slot >= LEGS[leg % LEGS.length].length) {
        viaCorner = true; // このレグは使い切り→外で折り返して次レグへ
        leg += 1;
        slot = 0;
      }
      const targetX = xAt(LEGS[leg % LEGS.length][slot]);
      slot += 1;

      // 現在地から toX まで坂を下る（rise時は 下り→登り→下り の峠。x単調なので交差しない）
      const descend = (toX: number, rise: boolean) => {
        const s = Math.sign(toX - cx) || 1;
        const h = Math.abs(toX - cx);
        if (rise && h >= 150) {
          const hr = 64;
          const h1 = Math.max(44, (h - hr) * 0.45);
          pts.push({ x: cx + s * h1, y: cy + h1 * SLOPE });
          pts.push({ x: cx + s * (h1 + hr), y: cy + (h1 - hr) * SLOPE });
          cy += (h - 2 * hr) * SLOPE;
        } else {
          cy += h * SLOPE;
        }
        cx = toX;
        pts.push({ x: cx, y: cy });
      };

      if (viaCorner) {
        descend(exitSign[k - 1] === 1 ? pathWidth - 22 : 22, false); // 折り返し点まで
        descend(targetX, wantRise);
      } else {
        descend(targetX, wantRise);
      }
      nodes.push({ x: cx, y: cy });
      links.push(pts);
    }
    exitSign.push(0); // 最後のノード（ゴール）に出線はない
    return { nodes, links, exitSign, height: cy + 120 };
  }, [chain, pathWidth]);

  const posOf = (k: number) => layout.nodes[k] ?? { x: pathWidth / 2, y: 64 };
  const pathHeight = layout.height;

  // 各チェーンアイテムの「到達判定」（この位置まで青い線が来ているか）
  const ordinalOf = (it: ChainItem) => (it.type === "goal" ? steps.length : it.stepIdx);
  const reached = (k: number) => ordinalOf(chain[k]) <= cur;

  // 今ここ（現在ステップのチェーン位置）
  const currentChainIdx = useMemo(
    () => chain.findIndex((it) => it.type === "step" && it.stepIdx === currentIdx),
    [chain, currentIdx]
  );
  const avatarPos = allDone
    ? posOf(chain.length - 1)
    : currentChainIdx >= 0
      ? posOf(currentChainIdx)
      : null;

  // 角を丸めたパス文字列（折り返しや峠のコーナーに半径を付ける）
  const r2 = (n: number) => Math.round(n * 10) / 10;
  const roundedD = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return "";
    let d = `M ${r2(pts[0].x)} ${r2(pts[0].y)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const a = pts[i - 1];
      const b = pts[i + 1];
      const d1 = Math.hypot(p.x - a.x, p.y - a.y) || 1;
      const d2 = Math.hypot(b.x - p.x, b.y - p.y) || 1;
      const l1 = Math.min(13, d1 / 2);
      const l2 = Math.min(13, d2 / 2);
      d += ` L ${r2(p.x - ((p.x - a.x) / d1) * l1)} ${r2(p.y - ((p.y - a.y) / d1) * l1)}`;
      d += ` Q ${r2(p.x)} ${r2(p.y)} ${r2(p.x + ((b.x - p.x) / d2) * l2)} ${r2(p.y + ((b.y - p.y) / d2) * l2)}`;
    }
    d += ` L ${r2(pts[pts.length - 1].x)} ${r2(pts[pts.length - 1].y)}`;
    return d;
  };

  // 出線（坂の下り）はノード直下を通るので、ラベルを反対側へ40pxずらす
  const labelShift = (k: number) => -(layout.exitSign[k] || 0) * 40;
  // 線がラベルをかすめても読めるように、背景色の縁取り
  const HALO = `0 1px 0 ${C.bg}, 0 -1px 0 ${C.bg}, 1px 0 0 ${C.bg}, -1px 0 0 ${C.bg}, 1px 1px 0 ${C.bg}, -1px -1px 0 ${C.bg}, 1px -1px 0 ${C.bg}, -1px 1px 0 ${C.bg}`;

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
          <BackToDashboard />
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

            {/* 学習パネル（左）＋道（右） */}
            <div className="mt-4 flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-6">
              <div id="learn-step-panel" className="md:sticky md:top-[84px] md:max-h-[calc(100vh-108px)] md:overflow-y-auto">
                {selected && panelPhase === "check" ? (
                  /* ===== チェック問題フェーズ（学んだ内容を過去問で確認） ===== */
                  <div className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-[16.5px] font-bold">チェック問題</h2>
                      <span className="min-w-0 truncate text-[12px] font-bold" style={{ color: C.muted }}>{selected.title}</span>
                    </div>
                    <div className="mt-2.5 flex gap-1.5">
                      {checkQs.map((cq, i) => (
                        <span
                          key={cq.id}
                          className="h-[8px] flex-1 rounded-full"
                          style={{
                            background: i < checkResults.length ? (checkResults[i] ? "#4ADE80" : "#F87171") : i === checkIdx ? C.brand : "#E3E8F0",
                            transition: "background .3s ease",
                          }}
                        />
                      ))}
                    </div>

                    {checkLoading ? (
                      <div className="flex items-center justify-center gap-2 py-14" style={{ color: C.faint }}>
                        <Loader2 className="h-5 w-5 animate-spin" /> 問題を準備中…
                      </div>
                    ) : checkFinished ? (
                      <div className="py-4 text-center">
                        {checkPassed ? (
                          <>
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#ECF6F0" }}>
                              <Trophy className="h-7 w-7" style={{ color: C.good }} />
                            </span>
                            <p className="mt-3 text-[17px] font-bold" style={{ color: "#0F6E56" }}>クリア！ {checkCorrectCount} / {checkQs.length} 正解</p>
                            <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>このステップを完了しました。道が先へ進みます。</p>
                            {stepIdx! + 1 < steps.length ? (
                              <button
                                onClick={() => router.replace(`${basePath}?step=${stepIdx! + 2}`, { scroll: false })}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                                style={{ background: C.brand }}
                              >
                                次のステップへ <ArrowRight className="h-5 w-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => router.replace(basePath, { scroll: false })}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                                style={{ background: C.good }}
                              >
                                <Trophy className="h-5 w-5" /> ゴール！道を見る
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#FBEDE6" }}>
                              <XCircle className="h-7 w-7" style={{ color: "#C2410C" }} />
                            </span>
                            <p className="mt-3 text-[17px] font-bold" style={{ color: "#B45309" }}>あと一歩！ {checkCorrectCount} / {checkQs.length} 正解</p>
                            <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>{passNeed(checkQs.length)}問正解でクリアです。用語を見直してから再挑戦しましょう。</p>
                            <button
                              onClick={() => setPanelPhase("learn")}
                              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14.5px] font-bold"
                              style={{ background: "#EDF1F6", color: C.ink }}
                            >
                              用語を見直す
                            </button>
                            <button
                              onClick={() => startCheck(selected, stepIdx!)}
                              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14.5px] font-bold text-white"
                              style={{ background: C.brand }}
                            >
                              もう一度挑戦する
                            </button>
                            <p className="mt-2 text-[11px]" style={{ color: C.faint }}>問題は挑戦のたびに入れ替わります。</p>
                          </>
                        )}
                      </div>
                    ) : checkQs[checkIdx] ? (
                      (() => {
                        const q = checkQs[checkIdx];
                        const answered = checkSel !== null;
                        const correct = checkSel === q.correct_answer;
                        return (
                          <div className="mt-3">
                            <div className="rounded-xl p-3.5" style={{ background: C.bg, border: `1px solid ${C.line}` }}>
                              {q.image_url ? (
                                <ZoomableImage src={q.image_url} alt={`問題 ${q.q_number ?? ""}`} className="h-auto w-full rounded-md" />
                              ) : (
                                <p className="text-[14px] leading-relaxed">{q.question}</p>
                              )}
                            </div>
                            <p className="mt-1.5 text-[10.5px]" style={{ color: C.faint }}>{questionSource(examId, q.year, q.q_number)}</p>
                            <div className="mt-2.5 space-y-2">
                              {(["a", "b", "c", "d"] as const).map((key) => {
                                const value = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d }[key];
                                const st = !answered
                                  ? { border: `2px solid ${C.line}`, background: "#fff" }
                                  : key === q.correct_answer
                                    ? { border: "2px solid #4ADE80", background: "#F0FDF4" }
                                    : key === checkSel
                                      ? { border: "2px solid #F87171", background: "#FEF2F2" }
                                      : { border: `2px solid ${C.line}`, background: "#fff", opacity: 0.6 };
                                return (
                                  <button key={key} onClick={() => answerCheck(key)} disabled={answered} className="w-full rounded-xl p-3 text-left transition-all" style={st}>
                                    <div className="flex items-start gap-2.5">
                                      <span
                                        className="w-5 flex-shrink-0 text-[13.5px] font-bold"
                                        style={{ color: answered && key === q.correct_answer ? "#16A34A" : answered && key === checkSel ? "#DC2626" : C.faint }}
                                      >
                                        {optionLabels[key]}
                                      </span>
                                      {!q.image_url && <span className="text-[13.5px] leading-relaxed" style={{ color: "#2b3648" }}>{value}</span>}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {answered && (
                              <>
                                <div className="mt-3 rounded-xl p-3.5" style={{ background: correct ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${correct ? "#BBF7D0" : "#FECACA"}` }}>
                                  <div className="flex items-center gap-1.5 text-[13.5px] font-bold" style={{ color: correct ? "#15803D" : "#B91C1C" }}>
                                    {correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                    {correct ? "正解！" : `不正解（正解は ${optionLabels[q.correct_answer]}）`}
                                  </div>
                                  <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "#3a4658" }}>{q.explanation}</p>
                                </div>
                                <button
                                  onClick={nextCheck}
                                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14.5px] font-bold text-white"
                                  style={{ background: C.brand }}
                                >
                                  {checkIdx + 1 < checkQs.length ? "次の問題へ" : "結果を見る"} <ArrowRight className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <p className="mt-2 text-center text-[11px]" style={{ color: C.faint }}>
                              問{checkIdx + 1} / {checkQs.length} ・ {passNeed(checkQs.length)}問正解でクリア
                            </p>
                          </div>
                        );
                      })()
                    ) : null}
                  </div>
                ) : selected ? (
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
                      ) : (pools.get(selected.section) ?? []).length > 0 ? (
                        <>
                          <button
                            onClick={() => startCheck(selected, stepIdx!)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                            style={{ background: C.brand }}
                          >
                            <Pencil className="h-5 w-5" />
                            チェック問題に挑戦（{Math.min(CHECK_N, (pools.get(selected.section) ?? []).length)}問）
                          </button>
                          <p className="mt-2 text-center text-[11.5px]" style={{ color: C.muted }}>
                            本物の過去問から出題。{passNeed(Math.min(CHECK_N, (pools.get(selected.section) ?? []).length))}問正解でこのステップをクリアです。
                          </p>
                        </>
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
                    {/* 背景の配線飾り */}
                    <g fill="none" stroke="#EAEEF5" strokeWidth={2}>
                      {Array.from({ length: Math.max(1, Math.ceil(pathHeight / 620)) }, (_, k) => (
                        <g key={k}>
                          <path d={`M ${pathWidth - 6} ${k * 620 + 90} h -40 l -22 11 h -34`} />
                          <circle cx={pathWidth - 106} cy={k * 620 + 101} r={3.5} fill="#EAEEF5" stroke="none" />
                          <path d={`M 6 ${k * 620 + 380} h 36 l 22 -11 h 32`} />
                          <circle cx={100} cy={k * 620 + 369} r={3.5} fill="#EAEEF5" stroke="none" />
                        </g>
                      ))}
                    </g>
                    {/* 道（1本のジグザグ山道。上から道が「やってくる」導入線つき） */}
                    <path
                      d={`M ${r2(posOf(0).x - 96)} ${r2(posOf(0).y - 96 * SLOPE)} L ${r2(posOf(0).x)} ${r2(posOf(0).y)}`}
                      fill="none"
                      strokeWidth={6}
                      strokeLinecap="round"
                      style={{ stroke: C.brand }}
                    />
                    {layout.links.map((pts, k) => {
                      const solid = reached(k + 1);
                      return (
                        <path
                          key={k}
                          d={roundedD(pts)}
                          fill="none"
                          strokeWidth={solid ? 6 : 4.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ stroke: solid ? C.brand : "#DFE5EE", transition: "stroke .5s ease" }}
                        />
                      );
                    })}
                  </svg>

                  {/* 進むマーカー（光＋ぷかぷか浮遊するクリスタル）＝現在地。完了すると次ノードへ滑る */}
                  {avatarPos && !allDone && (
                    <>
                      <style>{`@keyframes learnBob{from{transform:translateY(0)}to{transform:translateY(-8px)}}`}</style>
                      <span
                        className="absolute rounded-full"
                        style={{ left: avatarPos.x - 40, top: avatarPos.y - 40, width: 80, height: 80, background: C.brand, opacity: 0.12, filter: "blur(10px)", transition: "left .7s ease, top .7s ease" }}
                      />
                      <span
                        className="absolute"
                        style={{ left: avatarPos.x - 14, top: avatarPos.y - 72, transition: "left .7s ease, top .7s ease" }}
                      >
                        <span className="block" style={{ animation: "learnBob 1.5s ease-in-out infinite alternate" }}>
                          <svg width={28} height={36} viewBox="0 0 28 36" aria-hidden="true" style={{ filter: "drop-shadow(0 4px 8px rgba(29,78,216,0.45))" }}>
                            <polygon points="14,0 1,12 14,14" fill="#7DA0F8" />
                            <polygon points="14,0 27,12 14,14" fill="#4A74EF" />
                            <polygon points="1,12 14,36 14,14" fill="#2F5CD9" />
                            <polygon points="27,12 14,36 14,14" fill="#12318F" />
                            <polygon points="14,3 8,9 13,10" fill="rgba(255,255,255,0.55)" />
                          </svg>
                        </span>
                      </span>
                    </>
                  )}

                  {/* チェーンのノード描画 */}
                  {chain.map((it, k) => {
                    const { x, y } = posOf(k);
                    if (it.type === "badge") {
                      const on = reached(k);
                      return (
                        <span key={`b${k}`} className="absolute" style={{ left: x - 34, top: y - 26, width: 68 }}>
                          <span className="block text-center text-[9px] font-bold tracking-widest" style={{ color: on ? C.brand : "#AAB4C3", textShadow: HALO }}>LEVEL</span>
                          <span
                            className="mx-auto mt-0.5 flex h-[30px] w-[30px] rotate-45 items-center justify-center rounded-[7px]"
                            style={{ background: on ? C.brand : "#D9DFE9", border: "2.5px solid #fff", boxShadow: "0 2px 6px rgba(21,32,46,0.15)", transition: "background .4s ease" }}
                          >
                            <span className="-rotate-45 text-[12.5px] font-bold" style={{ color: on ? "#fff" : "#8E99A9" }}>{it.level}</span>
                          </span>
                        </span>
                      );
                    }
                    if (it.type === "goal") {
                      return (
                        <span key="goal">
                          <IsoPlatform x={x} y={y} palette={allDone ? PLAT.goal : PLAT.locked} />
                          <span className="absolute flex items-center justify-center" style={{ left: x - 10, top: y - 21, width: 20, height: 20 }}>
                            <Trophy style={{ width: 16, height: 16, color: allDone ? "#fff" : "#D4DAE3" }} />
                          </span>
                          <span className="absolute text-center" style={{ left: x - 80, top: y + 30, width: 160 }}>
                            <span className="block text-[13px] font-bold leading-tight" style={{ color: allDone ? C.good : C.muted, textShadow: HALO }}>
                              {catLabel} 総まとめ
                            </span>
                            <span className="block text-[11px]" style={{ color: C.faint, textShadow: HALO }}>{allDone ? "達成！" : "ゴール"}</span>
                          </span>
                        </span>
                      );
                    }
                    const s = steps[it.stepIdx];
                    const completed = isDone(s.id);
                    const isCurrent = it.stepIdx === currentIdx;
                    const isSelected = it.stepIdx === stepIdx;
                    const canOpen = completed || unlocked(it.stepIdx);
                    const node = (
                      <>
                        <IsoPlatform x={x} y={y} palette={completed || isCurrent ? PLAT.done : PLAT.locked} selected={isSelected} dimmed={!canOpen} />
                        <span className="absolute flex items-center justify-center" style={{ left: x - 10, top: y - 21, width: 20, height: 20 }}>
                          {completed ? (
                            <Check className="text-white" style={{ width: 17, height: 17 }} />
                          ) : isCurrent ? (
                            <Play className="text-white" style={{ width: 16, height: 16 }} />
                          ) : (
                            <Lock style={{ width: 14, height: 14, color: "#D4DAE3" }} />
                          )}
                        </span>
                        <span className="absolute text-center" style={{ left: x - 80 + labelShift(k), top: y + 30, width: 160 }}>
                          <span className="block text-[13px] font-bold leading-tight" style={{ color: canOpen ? C.ink : C.muted, textShadow: HALO }}>
                            {s.title}
                          </span>
                          <span className="block text-[11px]" style={{ color: isCurrent ? C.brand : C.faint, fontWeight: isCurrent ? 700 : 400, textShadow: HALO }}>
                            {completed ? `完了 ・ ${s.terms.length}語` : isCurrent ? "いま学べる →" : `未開放 ・ ${s.terms.length}語`}
                          </span>
                        </span>
                      </>
                    );
                    return canOpen ? (
                      <Link key={s.id} href={`${basePath}?step=${it.stepIdx + 1}`} replace scroll={false} className="block transition-opacity hover:opacity-85">
                        {node}
                      </Link>
                    ) : (
                      <div key={s.id}>{node}</div>
                    );
                  })}
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
