"use client";

// 学習する：②間違いの復習（Duolingo風）。/learn/[examId]/review
// - 復習対象＝一度でも間違え、まだ一度も正解していない問題（最近間違えた順）。1セット最大8問。
// - 上部のセグメントゲージ＝このセットで克服（正解）した数。
// - 不正解だった問題は、同じセットの最後にもう一度出る（克服するまでセットは終わらない）。
// - 解答は user_progress に記録する＝復習で正解すると弱点から自然に消える。

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { basicExams, displayCategory, questionSource } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchByIdsChunked } from "@/lib/supabase-fetch";
import { fetchWrongPool } from "@/lib/review";
import { type Question } from "@/components/quiz-runner";
import ZoomableImage from "@/components/zoomable-image";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import {
  ArrowLeft, ArrowRight, CheckCircle, Loader2, PenLine, RotateCcw, Trophy, UserPlus, XCircle,
} from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8",
  warn: "#C2410C", warnSoft: "#FBEDE6", warnPale: "#F0CDBA",
  good: "#0F8A5F", goodSoft: "#E7F3EE",
};

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };
const SESSION_SIZE = 8;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Phase = "loading" | "login" | "empty" | "quiz" | "done";

export default function ReviewPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = basicExams.find((e) => e.id === examId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [poolTotal, setPoolTotal] = useState(0); // 復習対象の総数（セット外も含む）
  const [sessionIds, setSessionIds] = useState<string[]>([]); // このセットの問題（元の順）
  const [queue, setQueue] = useState<Question[]>([]); // 出題キュー（先頭が現在の問題）
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [retries, setRetries] = useState(0); // もう一度出した回数
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  async function loadSession() {
    setPhase("loading");
    setSolved(new Set());
    setAttempts(0);
    setRetries(0);
    setSelected(null);
    setAnswered(false);
    const pool = await fetchWrongPool(examId);
    if (!pool.loggedIn) {
      setPhase("login");
      return;
    }
    setPoolTotal(pool.ids.length);
    if (pool.ids.length === 0) {
      setPhase("empty");
      return;
    }
    const ids = pool.ids.slice(0, SESSION_SIZE);
    const supabase = createSupabaseBrowserClient();
    const rows = await fetchByIdsChunked<Question>(
      (chunk) => supabase.from("questions").select("*").in("id", chunk),
      ids
    );
    // 「最近間違えた順」を保つ
    const byId = new Map(rows.map((q) => [q.id, q]));
    const qs = ids.map((id) => byId.get(id)).filter(Boolean) as Question[];
    if (qs.length === 0) {
      setPhase("empty");
      return;
    }
    setSessionIds(qs.map((q) => q.id));
    setQueue(qs);
    startRef.current = Date.now();
    setPhase("quiz");
  }

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const q = queue[0];
  const isCorrect = q ? selected === q.correct_answer : false;

  async function handleSelect(key: string) {
    if (!q || answered) return;
    setSelected(key);
    setAnswered(true);
    setAttempts((n) => n + 1);
    const correct = key === q.correct_answer;
    if (correct) {
      setSolved((prev) => new Set(prev).add(q.id));
    }
    // 解答を記録（復習で正解すれば弱点から消える）。失敗しても続行。
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

  function handleNext() {
    if (!q) return;
    const rest = queue.slice(1);
    const nextQueue = isCorrect ? rest : [...rest, q]; // 不正解ならセットの最後にもう一度
    if (!isCorrect) setRetries((n) => n + 1);
    setSelected(null);
    setAnswered(false);
    if (nextQueue.length === 0) {
      setElapsed(Math.round((Date.now() - startRef.current) / 1000));
      setPhase("done");
      setQueue([]);
      return;
    }
    setQueue(nextQueue);
  }

  const options: Record<string, string> = q
    ? { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d }
    : {};

  const optionStyle = (key: string) => {
    if (!answered) return { border: `2px solid ${C.line}`, background: C.card };
    if (q && key === q.correct_answer) return { border: "2px solid #4ADE80", background: "#F0FDF4" };
    if (key === selected && !isCorrect) return { border: "2px solid #F87171", background: "#FEF2F2" };
    return { border: `2px solid ${C.line}`, background: C.card, opacity: 0.6 };
  };

  const remainingPool = poolTotal - solved.size;

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 md:px-6">
          <Link href={`/learn/${examId}`} aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-[13px]" style={{ color: C.muted }}>{exam ? exam.name : "学習する"}</div>
            <div className="truncate text-[17px] font-bold">間違いの復習</div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-24 md:px-6 md:pb-6">
        {phase === "loading" && (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: C.faint }}>
            <Loader2 className="h-5 w-5 animate-spin" /> 読み込み中…
          </div>
        )}

        {phase === "login" && (
          <div className="mx-auto max-w-md rounded-2xl px-6 py-10 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: C.warnSoft }}>
              <RotateCcw className="h-7 w-7" style={{ color: C.warn }} />
            </span>
            <h1 className="mt-4 text-[17px] font-bold">間違いの復習は、解答の記録から自動で作られます</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
              無料会員登録（ログイン）すると、演習で間違えた問題がここに貯まり、克服するまで1問ずつやり直せます。
            </p>
            <Link
              href="/account"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
              style={{ background: C.brand }}
            >
              <UserPlus className="h-5 w-5" /> 無料登録 / ログイン
            </Link>
            <Link href={`/exam/${examId}`} className="mt-3 inline-block text-[13px] font-bold" style={{ color: C.brand }}>
              先に演習をはじめる →
            </Link>
          </div>
        )}

        {phase === "empty" && (
          <div className="mx-auto max-w-md rounded-2xl px-6 py-10 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: C.goodSoft }}>
              <Trophy className="h-7 w-7" style={{ color: C.good }} />
            </span>
            <h1 className="mt-4 text-[17px] font-bold">いま復習すべき間違いはありません！</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
              演習で間違えた問題は、正解できるまでここに自動で貯まります。
            </p>
            <Link
              href={`/exam/${examId}`}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
              style={{ background: C.brand }}
            >
              <PenLine className="h-5 w-5" /> 演習で力試しする
            </Link>
          </div>
        )}

        {phase === "quiz" && q && (
          <>
            {/* セグメントゲージ（このセットの克服状況） */}
            <div className="rounded-2xl px-4 py-3.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold" style={{ color: C.warn }}>
                  <RotateCcw className="mr-1 inline h-4 w-4 align-[-2px]" />
                  克服 {solved.size} / {sessionIds.length}
                </span>
                <span className="text-[12.5px]" style={{ color: C.muted }}>残り {queue.length}問</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {sessionIds.map((id) => (
                  <span
                    key={id}
                    className="h-[10px] flex-1 rounded-full"
                    style={{ background: solved.has(id) ? C.warn : "#F1E3D9", transition: "background .4s ease" }}
                  />
                ))}
              </div>
            </div>

            {/* 問題メタ */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: C.warnSoft, color: C.warn }}>
                前回不正解
              </span>
              <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: "#EEF2F9", color: "#33415A" }}>
                {displayCategory(examId, q.category)}
              </span>
              <span className="text-[12px]" style={{ color: C.faint }}>{q.year}</span>
            </div>

            {/* 問題文 */}
            <div className="mt-3 rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              {q.image_url ? (
                <ZoomableImage src={q.image_url} alt={`問題 ${q.q_number ?? ""}`} className="h-auto w-full rounded-md" />
              ) : (
                <p className="text-[15px] leading-relaxed">{q.question}</p>
              )}
            </div>
            <p className="mt-2 text-[11px]" style={{ color: C.faint }}>{questionSource(examId, q.year, q.q_number)}</p>

            {/* 選択肢 */}
            <div className="mt-3 space-y-2.5">
              {(Object.entries(options) as [string, string][]).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={answered}
                  className="w-full rounded-xl p-4 text-left transition-all"
                  style={optionStyle(key)}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-6 flex-shrink-0 text-[15px] font-bold"
                      style={{
                        color: answered && key === q.correct_answer ? "#16A34A" : answered && key === selected && !isCorrect ? "#DC2626" : C.faint,
                      }}
                    >
                      {optionLabels[key]}
                    </span>
                    {!q.image_url && <span className="text-[14.5px] leading-relaxed" style={{ color: "#2b3648" }}>{value}</span>}
                    {answered && key === q.correct_answer && (
                      <span className="ml-auto flex flex-shrink-0 items-center gap-1 text-[12.5px] font-bold" style={{ color: "#16A34A" }}>
                        <CheckCircle className="h-4.5 w-4.5" />正解
                      </span>
                    )}
                    {answered && key === selected && !isCorrect && (
                      <span className="ml-auto flex flex-shrink-0 items-center gap-1 text-[12.5px] font-bold" style={{ color: "#DC2626" }}>
                        <XCircle className="h-4.5 w-4.5" />あなたの解答
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* 解説＋次へ */}
            {answered && (
              <>
                <div className="mt-4 rounded-2xl p-5" style={{ background: isCorrect ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${isCorrect ? "#BBF7D0" : "#FECACA"}` }}>
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle className="h-5 w-5" style={{ color: "#16A34A" }} />
                        <span className="text-[15px] font-bold" style={{ color: "#15803D" }}>正解！ 克服しました</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" style={{ color: "#DC2626" }} />
                        <span className="text-[15px] font-bold" style={{ color: "#B91C1C" }}>不正解</span>
                        <span className="text-[13px]" style={{ color: "#DC2626" }}>正解は {optionLabels[q.correct_answer]}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-2.5 text-[14px] leading-relaxed" style={{ color: "#3a4658" }}>{q.explanation}</p>
                  {!isCorrect && (
                    <p className="mt-2.5 rounded-lg px-3 py-2 text-[12px] font-bold" style={{ background: C.warnSoft, color: C.warn }}>
                      この問題は、このセットの最後にもう一度出ます
                    </p>
                  )}
                  <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: C.faint }}>
                    ※この解説はIPA公式の解答解説ではなく、本サービスが独自に作成したものです。
                  </p>
                </div>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleNext}
                    className="flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-bold text-white"
                    style={{ background: C.warn }}
                  >
                    {queue.length === 1 && isCorrect ? "結果を見る" : "次の問題へ"}
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {phase === "done" && (
          <div className="mx-auto max-w-md rounded-2xl px-6 py-10 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: C.goodSoft }}>
              <Trophy className="h-8 w-8" style={{ color: C.good }} />
            </span>
            <h1 className="mt-4 text-[19px] font-bold">お疲れ様でした！</h1>
            <p className="mt-1 text-[13.5px]" style={{ color: C.muted }}>このセットの間違いをすべて克服しました。</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: "克服", value: `${sessionIds.length}問` },
                { label: "一発正解", value: `${Math.max(0, sessionIds.length - retries)}問` },
                { label: "時間", value: formatTime(elapsed) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl px-2 py-3" style={{ background: C.bg, border: `1px solid ${C.line}` }}>
                  <div className="text-[11.5px]" style={{ color: C.muted }}>{s.label}</div>
                  <div className="mt-0.5 text-[17px] font-bold">{s.value}</div>
                </div>
              ))}
            </div>
            {remainingPool > 0 ? (
              <>
                <p className="mt-5 text-[13px]" style={{ color: C.muted }}>復習できる間違いが、あと <b style={{ color: C.warn }}>{remainingPool}問</b> あります。</p>
                <button
                  onClick={loadSession}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                  style={{ background: C.warn }}
                >
                  <RotateCcw className="h-5 w-5" /> 次のセットへ
                </button>
              </>
            ) : (
              <p className="mt-5 text-[13.5px] font-bold" style={{ color: C.good }}>間違いをすべて克服しました 🎉</p>
            )}
            <Link
              href="/"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold"
              style={{ background: "#EDF1F6", color: C.ink }}
            >
              ダッシュボードに戻る
            </Link>
          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
}
