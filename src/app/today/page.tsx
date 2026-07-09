"use client";

// 今日の5問: AIが弱点分野から選ぶ、1タップで始まるデイリー演習。/today?exam=ip
// - 出題元＝弱点分析でいちばん正答率が低い分野（解答2問以上）。データが無い人は主要分野からの腕試し。
// - 1問ごとに正誤＋解説を即表示（市場調査: 「その場で解説」が最も好まれる）。
// - 解答は user_progress に記録＝弱点分析・間違いの復習・連続日数につながる。
// - 結果画面＝報酬: 正解数・連続日数（Studyplus調査の「見える化でモチベ80.7%」をここで回収）。

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { basicExams, getExam, displayCategory, learnCategoryFor, questionSource, TRACK_SOURCES } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { calcStreak, fmtDateJst, getActiveExam, toDayStrings } from "@/lib/streak";
import { getTodayCount, incTodayCount, remainingToday, TODAY_LIMIT, type Tier } from "@/lib/quota";
import { type Question } from "@/components/quiz-runner";
import {
  ArrowLeft, ArrowRight, CheckCircle, Flame, Loader2, LogIn, Pencil, RotateCcw, Sparkles, XCircle,
} from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8", good: "#0F8A5F", goodSoft: "#E7F3EE",
};

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };
const N = 5;

// 出題を「日替わり固定」にするための決定的乱数（FNV-1aハッシュ→mulberry32）。
// シード＝JST日付＋試験＋その日の実施回数。同じ日に開き直しても同じ5問、
// 「もう5問」は実施回数が進むので別セットになる。
function seededRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffleWith = <T,>(arr: T[], rnd: () => number) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// データが無い人向けの腕試し出題分野（診断と同じ主要分野）
const TRY_CATS: Record<string, string[]> = {
  ip: ["セキュリティ", "ネットワーク", "企業活動", "経営戦略マネジメント", "プロジェクトマネジメント"],
  fe: ["セキュリティ", "ネットワーク", "データベース", "アルゴリズムとプログラミング", "経営戦略マネジメント"],
  ap: ["セキュリティ", "ネットワーク", "データベース", "システム開発技術", "経営戦略マネジメント"],
};

type WeakRow = { exam_id: string; category: string; answered: number; correct: number };
type Phase = "loading" | "quiz" | "done" | "limit";

function TodayContent() {
  const sp = useSearchParams();
  const [exam, setExam] = useState("ip");
  const [phase, setPhase] = useState<Phase>("loading");
  const [fromWeak, setFromWeak] = useState<string | null>(null);
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [streak, setStreak] = useState(0);
  const [tier, setTier] = useState<Tier>("guest");
  const examRef = useRef("ip");
  const tierRef = useRef<Tier>("guest");

  useEffect(() => {
    const e = sp.get("exam");
    const id = e && getExam(e) ? e : getActiveExam();
    setExam(id);
    examRef.current = id;
    (async () => {
      // ティア判定（未ログイン/無料/有料）＝1日の回数上限に使う。
      // 注意: getUser() の「例外（ネットワーク断・セッション取得失敗）」と「正常に未ログインと判明」は
      // 区別する。前者で guest 固定にすると、ログイン済み会員が一時的な失敗で guest 上限に落ちてしまう。
      let t: Tier = "guest";
      try {
        const supabase = createSupabaseBrowserClient();
        let userRes = await supabase.auth.getUser().catch(() => null);
        if (userRes === null) {
          // 一時的な取得失敗の可能性。1回だけリトライしてから判断する。
          await new Promise((r) => setTimeout(r, 400));
          userRes = await supabase.auth.getUser().catch(() => null);
        }
        if (userRes === null) {
          // 認証状態を確定できなかった。会員を guest 上限に落とさないよう free 扱いにする（過度に緩めない）。
          t = "free";
        } else {
          const user = userRes.data?.user ?? null;
          if (user && !user.is_anonymous) {
            const { data: sub } = await supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle();
            const pro = sub?.status === "active" && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
            t = pro ? "pro" : "free";
          }
          // user===null は「正常に未ログインと判明」＝guest のまま。
        }
      } catch {
        // 想定外の例外でも会員を過度に制限しないよう free にフォールバック。
        t = "free";
      }
      tierRef.current = t;
      setTier(t);
      startOrGate(id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 上限チェック→OKなら出題、超過なら案内画面へ。
  // 回数の消費は「実際に出題が確定したとき」だけ行う（load内）。表示しただけ／0件で
  // done に落ちたときに枠を溶かさないため。
  function startOrGate(examId: string) {
    if (remainingToday(tierRef.current) <= 0) {
      setPhase("limit");
      return;
    }
    load(examId);
  }

  async function load(examId: string) {
    setPhase("loading");
    setIdx(0);
    setSel(null);
    setResults([]);
    const supabase = createSupabaseBrowserClient();
    // 日替わり固定のシード（実施回数が進むと別セット）
    const rnd = seededRng(`${fmtDateJst(new Date())}:${examId}:${getTodayCount()}`);
    // 弱点のいちばん低い分野を出題元にする（無ければ腕試し分野からランダム）。
    // RPCが詰まっても出題を止めないよう5秒でフォールバックする。
    let cat: string | null = null;
    try {
      const res = await Promise.race([
        supabase.rpc("get_weakness_stats"),
        new Promise<{ data: null }>((r) => setTimeout(() => r({ data: null }), 5000)),
      ]);
      const data = res?.data;
      const rows = ((data ?? []) as WeakRow[])
        .map((x) => ({ ...x, answered: Number(x.answered), correct: Number(x.correct) }))
        .filter((r) => r.exam_id === examId && r.answered >= 2);
      if (rows.length > 0) {
        rows.sort((a, b) => a.correct / a.answered - b.correct / b.answered);
        cat = rows[0].category;
        setFromWeak(cat);
      }
    } catch {}
    // 2027新試験は構成元試験の過去問を横断出題する
    const sourceIds = TRACK_SOURCES[examId] ?? [examId];
    if (!cat) {
      if (TRACK_SOURCES[examId]) {
        // 新試験で弱点データが無いときは分野を絞らず構成元全体から出題
        setFromWeak(null);
      } else {
        const cats = TRY_CATS[examId] ?? TRY_CATS.ip;
        cat = cats[Math.floor(rnd() * cats.length)];
        setFromWeak(null);
      }
    }
    let idsQuery = supabase
      .from("questions")
      .select("id")
      .in("exam_id", sourceIds)
      .eq("type", "past")
      .is("image_url", null)
      .order("id"); // 取得順を固定して選抜を決定的にする
    if (cat) idsQuery = idsQuery.eq("category", cat);
    const { data: ids } = await idsQuery;
    const pick = shuffleWith(((ids ?? []) as { id: string }[]).map((r) => r.id), rnd).slice(0, N);
    const { data } = await supabase.from("questions").select("*").in("id", pick);
    const list = shuffleWith(
      ((data ?? []) as Question[]).slice().sort((a, b) => (a.id < b.id ? -1 : 1)),
      rnd
    );
    if (list.length === 0) {
      setPhase("done");
      return;
    }
    incTodayCount(); // 出題が確定したときだけ1回分を消費する
    setQs(list);
    setPhase("quiz");
  }

  const q = qs[idx];
  const answered = sel !== null;
  const isCorrect = q ? sel === q.correct_answer : false;

  async function answer(key: string) {
    if (!q || answered) return;
    setSel(key);
    const correct = key === q.correct_answer;
    setResults((prev) => [...prev, correct]);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_progress").insert({
          user_id: user.id,
          question_id: q.id,
          exam_id: examRef.current,
          year: q.year,
          is_correct: correct,
        });
      }
    } catch {}
  }

  async function next() {
    if (idx + 1 < qs.length) {
      setIdx((i) => i + 1);
      setSel(null);
      return;
    }
    // 報酬画面へ（連続日数を取り直す＝今日の分が反映される）
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.rpc("get_answered_days_jst");
      setStreak(calcStreak(toDayStrings(data)));
    } catch {}
    setSel(null);
    setPhase("done");
  }

  const correctCount = results.filter(Boolean).length;
  const wrongCount = results.length - correctCount;
  const exam_ = getExam(exam);

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.9)", borderColor: C.line, backdropFilter: "blur(10px)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5 md:px-6">
          <Link href="/" aria-label="ホームへ" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-[12px]" style={{ color: C.muted }}>{exam_ ? exam_.name : ""}</div>
            <div className="truncate text-[16px] font-bold">今日の5問</div>
          </div>
          {phase === "quiz" && (
            <span className="ml-auto text-[12.5px] font-bold" style={{ color: C.muted }}>問 {idx + 1} / {qs.length}</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4 md:px-6">
        {phase === "loading" && (
          <div className="flex items-center justify-center gap-2 py-24" style={{ color: C.faint }}>
            <Loader2 className="h-5 w-5 animate-spin" /> 今日の5問を準備しています…
          </div>
        )}

        {phase === "limit" && (
          <div className="mx-auto max-w-md pt-6">
            <div className="rounded-3xl px-6 py-8 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                <Sparkles className="h-7 w-7" />
              </span>
              <h1 className="mt-4 text-[18px] font-bold">今日の5問は本日ぶんが終了です</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
                {tier === "guest"
                  ? `未ログインは1日${TODAY_LIMIT.guest}回まで。無料会員登録すると1日${TODAY_LIMIT.free}回に増えます。`
                  : `無料会員は1日${TODAY_LIMIT.free}回まで。Pro（有料）なら回数無制限で解けます。`}
              </p>
              {tier === "guest" ? (
                <Link href="/account" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white" style={{ background: C.brand }}>
                  <LogIn className="h-5 w-5" /> 無料会員登録・ログイン
                </Link>
              ) : (
                <Link href="/premium" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white" style={{ background: "#0E1B33" }}>
                  <Sparkles className="h-5 w-5" /> Proにアップグレード
                </Link>
              )}
              <Link href="/" className="mt-3 inline-block text-[13px] font-bold" style={{ color: C.brand }}>
                ホームに戻る
              </Link>
            </div>
            <p className="mt-3 text-center text-[11.5px]" style={{ color: C.faint }}>
              ほかの学習（ステップ学習・復習・じっくり演習）は引き続き使えます。
            </p>
          </div>
        )}

        {phase === "quiz" && q && (
          <>
            <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: "#4F46E5" }}>
                <Sparkles className="h-4 w-4" />
                {fromWeak ? `弱点「${displayCategory(exam, fromWeak)}」から出題中` : "腕試しで出題中"}
              </span>
              <span className="flex gap-1">
                {Array.from({ length: qs.length }, (_, i) => (
                  <span
                    key={i}
                    className="h-[8px] w-6 rounded-full"
                    style={{ background: i < results.length ? (results[i] ? "#4ADE80" : "#F87171") : i === idx ? C.brand : "#E3E8F0" }}
                  />
                ))}
              </span>
            </div>

            <div className="mt-3 rounded-2xl p-4.5 md:p-5" style={{ background: C.card, border: `1px solid ${C.line}`, padding: 18 }}>
              <p className="text-[15px] leading-relaxed">{q.question}</p>
            </div>
            <p className="mt-1.5 text-[10.5px]" style={{ color: C.faint }}>{questionSource(q.exam_id ?? exam, q.year, q.q_number)}</p>

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
                <div className="mt-3 rounded-2xl p-4" style={{ background: isCorrect ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${isCorrect ? "#BBF7D0" : "#FECACA"}` }}>
                  <div className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: isCorrect ? "#15803D" : "#B91C1C" }}>
                    {isCorrect ? <CheckCircle className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /> : <XCircle style={{ width: 18, height: 18 }} />}
                    {isCorrect ? "正解！" : `不正解（正解は ${optionLabels[q.correct_answer]}）`}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#3a4658" }}>{q.explanation}</p>
                  <p className="mt-2 text-[10.5px]" style={{ color: C.faint }}>※解説はIPA公式ではなく本サービスが独自に作成したものです。</p>
                </div>
                <button
                  onClick={next}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                  style={{ background: C.brand }}
                >
                  {idx + 1 < qs.length ? "次の問題へ" : "結果を見る"} <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}
          </>
        )}

        {phase === "done" && (
          <div className="mx-auto max-w-md">
            <div className="rounded-3xl px-6 py-8 text-center text-white" style={{ background: "linear-gradient(135deg, #1D4ED8, #4F46E5)" }}>
              <div className="text-[13px] font-bold text-white/85">
                {results.length === 0 ? "本日はここまで" : "今日の5問、完了！"}
              </div>
              {results.length === 0 ? (
                <div className="mt-2 text-[15px] font-bold leading-snug">
                  この分野で出題できる問題が見つかりませんでした
                </div>
              ) : (
                <div className="mt-2 flex items-end justify-center gap-1">
                  <span className="text-[56px] font-bold leading-none">{correctCount}</span>
                  <span className="mb-1.5 text-[18px] text-white/80">/ {results.length} 問正解</span>
                </div>
              )}
              <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full px-4 py-2" style={{ background: "rgba(255,255,255,0.16)" }}>
                <Flame className="h-5 w-5" style={{ color: "#FDBA74" }} />
                <span className="text-[14.5px] font-bold">連続 {streak}日目</span>
              </div>
              {fromWeak && (
                <p className="mt-3 text-[12.5px] text-white/85">
                  弱点「{displayCategory(exam, fromWeak)}」に効いています。明日も5問で続けましょう。
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2.5">
              {wrongCount > 0 && (
                <Link
                  href={`/learn/${exam}/review`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#C2410C" }}
                >
                  <RotateCcw className="h-5 w-5" /> 間違えた{wrongCount}問を克服する
                </Link>
              )}
              {fromWeak && (
                <Link
                  href={`/learn/${exam}/${encodeURIComponent(learnCategoryFor(exam, fromWeak))}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white"
                  style={{ background: C.brand }}
                >
                  <Pencil className="h-5 w-5" /> 「{displayCategory(exam, fromWeak)}」を学び直す
                </Link>
              )}
              <button
                onClick={() => startOrGate(examRef.current)}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold"
                style={{ background: "#EDF1F6", color: C.ink }}
              >
                もう5問解く
              </button>
              <Link
                href="/stats"
                className="block text-center text-[12.5px] font-bold"
                style={{ color: C.brand }}
              >
                スコアと弱点の変化を見る →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#F5F7FA" }} />}>
      <TodayContent />
    </Suspense>
  );
}
