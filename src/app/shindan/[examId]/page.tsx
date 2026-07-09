"use client";

// AI合格診断: 登録不要・10問・3分で、合格可能性スコアと最大の弱点をAIが示す入口ページ。
// /shindan/[examId]
// - 出題は本物の過去問のみ。5分野×2問（分野を散らして弱点を推定できる形にする）。
// - 解答は user_progress に記録（ゲスト=匿名認証でも記録される）→そのまま弱点分析・復習に接続。
// - 結果はXシェア用URL（/shindan/[examId]/r?s=&w=）へ。OGP画像は /api/og/shindan で動的生成。

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { basicExams, displayCategory, learnCategoryFor, questionSource } from "@/lib/exams";
import { setActiveExamStorage } from "@/lib/streak";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { type Question } from "@/components/quiz-runner";
import { BackToDashboard } from "@/components/back-to-dashboard";
import {
  ArrowRight, Brain, CheckCircle, ClipboardCheck, Clock, Loader2, Pencil, Share2, Sparkles, UserRound, XCircle,
} from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8", good: "#0F8A5F", goodSoft: "#E7F3EE",
  warn: "#B45309", warnSoft: "#FEF3C7", bad: "#BE123C", badSoft: "#FFE4E6",
};

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

// 診断で使う5分野（×2問=10問）。試験ごとに主要領域を散らす。
const DIAG_CATS: Record<string, string[]> = {
  ip: ["セキュリティ", "ネットワーク", "企業活動", "経営戦略マネジメント", "プロジェクトマネジメント"],
  fe: ["セキュリティ", "ネットワーク", "データベース", "アルゴリズムとプログラミング", "経営戦略マネジメント"],
  ap: ["セキュリティ", "ネットワーク", "データベース", "システム開発技術", "経営戦略マネジメント"],
};

function bandOf(score: number) {
  if (score >= 65) return { label: "合格圏", fg: C.good, soft: C.goodSoft };
  if (score >= 40) return { label: "あと少し", fg: C.warn, soft: C.warnSoft };
  return { label: "要対策", fg: C.bad, soft: C.badSoft };
}

type Phase = "intro" | "loading" | "quiz" | "result";

// 円形スコアゲージ（結果画面・スタート画面のイメージカード共用）
function ScoreRing({
  score, size, stroke, color, track, children,
}: {
  score: number; size: number; stroke: number; color: string; track: string; children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export default function ShindanPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = basicExams.find((e) => e.id === examId);
  const cats = DIAG_CATS[examId] ?? DIAG_CATS.fe;

  const [phase, setPhase] = useState<Phase>("intro");
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [results, setResults] = useState<{ category: string; correct: boolean }[]>([]);
  const [ringScore, setRingScore] = useState(0); // 結果画面のゲージ演出（0→スコアへ伸びる）
  const startRef = useRef(0);

  // 固定ポスト等から診断に着地した人の「選択中の試験」をこの診断の試験に合わせる
  // （診断後にダッシュボードへ行っても同じ試験の画面が出るように）
  useEffect(() => {
    if (exam) setActiveExamStorage(examId);
  }, [examId, exam]);

  async function start() {
    setPhase("loading");
    setResults([]);
    setIdx(0);
    setSel(null);
    const supabase = createSupabaseBrowserClient();
    // 各分野からランダム2問（画像問題は除外して表示を軽く）
    const idsPerCat = await Promise.all(
      cats.map(async (cat) => {
        const { data } = await supabase
          .from("questions")
          .select("id")
          .eq("exam_id", examId)
          .eq("type", "past")
          .eq("category", cat)
          .is("image_url", null);
        return shuffle(((data ?? []) as { id: string }[]).map((r) => r.id)).slice(0, 2);
      })
    );
    const ids = idsPerCat.flat();
    const { data } = await supabase.from("questions").select("*").in("id", ids);
    const list = shuffle((data ?? []) as Question[]);
    if (list.length === 0) {
      setPhase("intro");
      return;
    }
    setQs(list);
    startRef.current = Date.now();
    setPhase("quiz");
  }

  const q = qs[idx];
  const answered = sel !== null;
  const isCorrect = q ? sel === q.correct_answer : false;

  async function answer(key: string) {
    if (!q || answered) return;
    setSel(key);
    const correct = key === q.correct_answer;
    setResults((prev) => [...prev, { category: q.category, correct }]);
    // 診断の解答も演習と同じく記録（そのまま弱点分析・間違いの復習に繋がる）
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

  function next() {
    if (idx + 1 < qs.length) {
      setIdx((i) => i + 1);
      setSel(null);
    } else {
      setSel(null);
      setPhase("result");
    }
  }

  // ===== 結果の計算 =====
  const correctCount = results.filter((r) => r.correct).length;
  const score = correctCount * 10;
  const band = bandOf(score);

  // 結果表示時にゲージを0からスコアまで伸ばす
  useEffect(() => {
    if (phase !== "result") return;
    setRingScore(0);
    const t = setTimeout(() => setRingScore(score), 200);
    return () => clearTimeout(t);
  }, [phase, score]);
  const perCat = cats.map((cat) => {
    const rows = results.filter((r) => r.category === cat);
    return { cat, total: rows.length, correct: rows.filter((r) => r.correct).length };
  });
  const withWrong = perCat.filter((c) => c.total > 0 && c.correct < c.total);
  const weakest = withWrong.length > 0 ? withWrong.reduce((a, b) => (b.correct < a.correct ? b : a)) : null;
  const gain = weakest ? (weakest.total - weakest.correct) * 10 : 0;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://kakomon-labo.com";
  const shareUrl = `${origin}/shindan/${examId}/r?s=${score}${weakest ? `&w=${encodeURIComponent(weakest.cat)}` : ""}`;
  const shareText = `【${exam?.name ?? ""} AI合格診断】合格可能性スコア ${score}/100（${band.label}）${weakest ? `。最大の弱点は「${displayCategory(examId, weakest.cat)}」でした` : ""}。10問・3分・登録不要 #過去問演習ラボ`;
  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  if (!exam) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh" }} className="flex items-center justify-center font-sans">
        <Link href="/" className="text-[14px] font-bold" style={{ color: C.brand }}>過去問演習ラボへ →</Link>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 md:px-6 md:py-4">
          <div className="min-w-0">
            <div className="hidden text-[13px] md:block" style={{ color: C.muted }}>{exam.name}</div>
            <div className="truncate text-[17px] font-bold">AI合格診断</div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-6">
        {phase === "intro" && (
          <>
            <div className="flex justify-center">
              <div
                className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full p-1 shadow-sm"
                style={{ background: "#FFFFFF", border: `1px solid ${C.line}` }}
              >
                {basicExams.map((e) => {
                  const active = e.id === examId;
                  return (
                    <Link
                      key={e.id}
                      href={`/shindan/${e.id}`}
                      className="whitespace-nowrap rounded-full px-6 py-2 text-[15px] font-bold transition-colors"
                      style={
                        active
                          ? { background: "#DB2777", color: "#fff", boxShadow: "0 4px 12px rgba(219,39,119,0.35)" }
                          : { color: "#33415A" }
                      }
                    >
                      {e.name.replace("技術者試験", "").replace("試験", "")}
                      {e.id === "ap" ? "（午前）" : ""}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 items-center gap-10 md:mt-7 md:grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <div className="text-center md:text-left">
                <div className="text-[13px] font-bold tracking-wide" style={{ color: "#4F46E5" }}>AI合格診断（無料）</div>
                <h1 className="mt-2 text-[25px] font-bold leading-snug md:text-[33px]">
                  10問で、AIがあなたの
                  <br />
                  合格可能性と弱点を示します
                </h1>
                <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed md:mx-0" style={{ color: C.muted }}>
                  本物の{exam.name.replace("試験", "")}過去問から分野を散らして10問を出題。解き終わった瞬間に、合格可能性スコアと「最初に潰すべき弱点」がわかります。
                </p>
                <button
                  onClick={start}
                  className="mx-auto mt-5 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[16px] font-bold text-white transition-transform hover:-translate-y-0.5 md:mt-6 md:py-4 md:mx-0"
                  style={{ background: C.brand, boxShadow: "0 10px 24px rgba(29,78,216,0.28)" }}
                >
                  診断をはじめる <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-3 text-[12.5px]" style={{ color: C.faint }}>登録不要・約3分・本物の過去問だけを使用</p>
              </div>

              {/* 3分後に届く「結果のイメージ」プレビュー */}
              <div className="relative mx-auto mt-6 w-full max-w-[290px] md:mt-0">
                <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: "#111827" }}>
                  3分後、あなたに届く結果
                </span>
                <div className="rounded-3xl p-6 text-center text-white shadow-xl" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  <div className="text-[11.5px] font-bold text-white/85">合格可能性スコア</div>
                  <div className="mt-3 flex justify-center">
                    <ScoreRing score={65} size={128} stroke={11} color="#fff" track="rgba(255,255,255,0.22)">
                      <span className="text-[34px] font-bold leading-none">65</span>
                      <span className="mt-0.5 text-[10.5px] text-white/75">/100</span>
                    </ScoreRing>
                  </div>
                  <span className="mt-3 inline-block rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: "rgba(255,255,255,0.92)", color: C.good }}>
                    合格圏
                  </span>
                  <div className="mt-3 rounded-xl px-3 py-2 text-[11.5px] font-bold" style={{ background: "rgba(255,255,255,0.16)" }}>
                    最大の弱点：「セキュリティ」
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-2.5 md:grid-cols-3">
              {[
                { icon: Pencil, title: "10問解く", desc: "5分野×2問。本物の過去問です" },
                { icon: Sparkles, title: "AIが弱点を示す", desc: "スコアと最大の弱点がその場で出ます" },
                { icon: ClipboardCheck, title: "弱点を潰す", desc: "そのまま学習・復習モードに接続" },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                    <s.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="text-[13.5px] font-bold">{i + 1}. {s.title}</div>
                    <div className="mt-0.5 text-[12px]" style={{ color: C.muted }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11.5px]" style={{ color: C.faint }}>
              出典：IPA（独立行政法人情報処理推進機構）の公開過去問題。診断は10問の簡易版です。
            </p>
          </>
        )}

        {phase === "loading" && (
          <div className="flex items-center justify-center gap-2 py-24" style={{ color: C.faint }}>
            <Loader2 className="h-5 w-5 animate-spin" /> 問題を準備中…
          </div>
        )}

        {phase === "quiz" && q && (
          <>
            <div className="rounded-2xl px-4 py-3.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold" style={{ color: "#4F46E5" }}>
                  <Brain className="mr-1 inline h-4 w-4 align-[-2px]" /> AI合格診断
                </span>
                <span className="text-[12.5px] font-bold" style={{ color: C.muted }}>問 {idx + 1} / {qs.length}</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {qs.map((qq, i) => (
                  <span
                    key={qq.id}
                    className="h-[8px] flex-1 rounded-full"
                    style={{
                      background: i < results.length ? (results[i].correct ? "#4ADE80" : "#F87171") : i === idx ? "#4F46E5" : "#E3E8F0",
                      transition: "background .3s ease",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <p className="text-[15px] leading-relaxed">{q.question}</p>
            </div>
            <p className="mt-1.5 text-[10.5px]" style={{ color: C.faint }}>{questionSource(examId, q.year, q.q_number)}</p>

            <div className="mt-3 space-y-2.5">
              {(["a", "b", "c", "d"] as const).map((key) => {
                const value = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d }[key];
                const st = !answered
                  ? { border: `2px solid ${C.line}`, background: "#fff" }
                  : key === q.correct_answer
                    ? { border: "2px solid #4ADE80", background: "#F0FDF4" }
                    : key === sel
                      ? { border: "2px solid #F87171", background: "#FEF2F2" }
                      : { border: `2px solid ${C.line}`, background: "#fff", opacity: 0.6 };
                return (
                  <button key={key} onClick={() => answer(key)} disabled={answered} className="w-full rounded-xl p-3.5 text-left transition-all" style={st}>
                    <div className="flex items-start gap-3">
                      <span
                        className="w-6 flex-shrink-0 text-[14.5px] font-bold"
                        style={{ color: answered && key === q.correct_answer ? "#16A34A" : answered && key === sel && !isCorrect ? "#DC2626" : C.faint }}
                      >
                        {optionLabels[key]}
                      </span>
                      <span className="text-[14px] leading-relaxed" style={{ color: "#2b3648" }}>{value}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {answered && (
              <>
                <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: isCorrect ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${isCorrect ? "#BBF7D0" : "#FECACA"}` }}>
                  {isCorrect ? <CheckCircle className="h-5 w-5" style={{ color: "#16A34A" }} /> : <XCircle className="h-5 w-5" style={{ color: "#DC2626" }} />}
                  <span className="text-[14px] font-bold" style={{ color: isCorrect ? "#15803D" : "#B91C1C" }}>
                    {isCorrect ? "正解！" : `不正解（正解は ${optionLabels[q.correct_answer]}）`}
                  </span>
                  <span className="ml-auto text-[11.5px]" style={{ color: C.faint }}>解説は診断後に見られます</span>
                </div>
                <button
                  onClick={next}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#4F46E5" }}
                >
                  {idx + 1 < qs.length ? "次の問題へ" : "診断結果を見る"} <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}
          </>
        )}

        {phase === "result" && (
          <>
            <div className="rounded-3xl px-6 py-8 text-center text-white" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <div className="text-[13.5px] font-bold text-white/85">{exam.name}・AI合格診断の結果</div>
              <div className="mt-5 flex justify-center">
                <ScoreRing score={ringScore} size={190} stroke={14} color="#fff" track="rgba(255,255,255,0.22)">
                  <span className="text-[54px] font-bold leading-none">{score}</span>
                  <span className="mt-1 text-[13px] text-white/75">/100</span>
                </ScoreRing>
              </div>
              <div className="mt-4 text-[13px] text-white/85">合格可能性スコア（10問の簡易診断）</div>
              <span className="mt-2.5 inline-block rounded-full px-4 py-1.5 text-[15px] font-bold" style={{ background: "rgba(255,255,255,0.92)", color: band.fg }}>
                {band.label}
              </span>
            </div>

            {weakest ? (
              <div className="mt-4 rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "#4F46E5" }}>
                  <Sparkles className="h-4 w-4" /> AIの診断結果
                </div>
                <p className="mt-2 text-[16px] font-bold leading-relaxed">
                  あなたの最大の弱点は<span style={{ color: C.bad }}>「{displayCategory(examId, weakest.cat)}」</span>。
                  {weakest.total}問中{weakest.total - weakest.correct}問ミスでした。
                </p>
                <p className="mt-1 text-[13px]" style={{ color: C.muted }}>
                  ここを潰せばスコア <b style={{ color: C.good }}>+{gain}点</b> が見込めます。まずはこの分野から始めましょう。
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl p-5 text-center" style={{ background: C.goodSoft, border: "1px solid #BFE4CE" }}>
                <p className="text-[15px] font-bold" style={{ color: "#0F6E56" }}>全問正解！この10問に弱点はありませんでした 🎉</p>
              </div>
            )}

            {/* 分野別の内訳 */}
            <div className="mt-3 rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="text-[13px] font-bold" style={{ color: C.muted }}>分野別の結果</div>
              <div className="mt-3 space-y-2.5">
                {perCat.map((c) => (
                  <div key={c.cat} className="flex items-center gap-3">
                    <span className="w-40 flex-none truncate text-[12.5px] font-bold">{displayCategory(examId, c.cat)}</span>
                    <div className="h-[9px] flex-1 overflow-hidden rounded-full" style={{ background: "#EDF1F6" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${c.total ? (c.correct / c.total) * 100 : 0}%`, background: c.correct === c.total ? C.good : c.correct === 0 ? C.bad : C.warn }}
                      />
                    </div>
                    <span className="w-9 flex-none text-right text-[12.5px] font-bold" style={{ color: C.muted }}>{c.correct}/{c.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* アクション */}
            <div className="mt-4 space-y-2.5">
              <a
                href={tweetHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                style={{ background: "#111827" }}
              >
                <Share2 className="h-5 w-5" /> 結果をXでシェアする
              </a>
              {weakest && (
                <Link
                  href={`/learn/${examId}/${encodeURIComponent(learnCategoryFor(examId, weakest.cat))}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                  style={{ background: C.brand }}
                >
                  <Pencil className="h-5 w-5" /> 「{displayCategory(examId, weakest.cat)}」を潰しにいく（無料）
                </Link>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={start} className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[13.5px] font-bold" style={{ background: "#EDF1F6", color: C.ink }}>
                  <Clock className="h-4 w-4" /> もう一度診断
                </button>
                <Link href="/account" className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[13.5px] font-bold" style={{ background: "#EDF1F6", color: C.ink }}>
                  <UserRound className="h-4 w-4" /> 登録して記録を残す
                </Link>
              </div>
            </div>
            <p className="mt-3 text-center text-[11.5px]" style={{ color: C.faint }}>
              診断の解答は記録され、ダッシュボードの弱点分析・間違えた問題の復習にそのまま繋がります。
            </p>
          </>
        )}
      </main>
    </div>
  );
}
