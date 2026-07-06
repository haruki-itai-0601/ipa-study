"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/track";
import { CheckCircle2, XCircle, CircleDot, ClipboardCheck, Sparkles, Loader2, Lock, ChevronUp, X } from "lucide-react";

type AnswerType = "symbol" | "number" | "short" | "text";

type SubAnswer = {
  id: string;
  label: string;
  sub_order: number;
  answer_type: AnswerType;
  // 記号・数値・短答の模範解答（自動採点用）。記述(text)は空文字＝クライアントに渡さない
  // （記述の模範解答は有料コンテンツ。採点API応答からのみ表示する＝カンニング防止）。
  correct: string;
};

// 採点結果。status は両系統で共通、comment は記述のAI講評／エラーメッセージ、
// correct は採点後にサーバーから返る模範解答（記述の表示用）
type GradeStatus = "correct" | "partial" | "wrong" | "unanswered" | "pending" | "error" | "member_only";
type Grade = { status: GradeStatus; comment?: string; correct?: string };

// 採点用の正規化：全角英数→半角、各種空白・記号ゆれを吸収して比較する
function normalizeAns(s: string): string {
  return (s ?? "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[，、]/g, ",")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[－ー―−‐]/g, "-")
    .replace(/[＋]/g, "+")
    .replace(/[／]/g, "/")
    .replace(/\s|　/g, "")
    .toLowerCase()
    .trim();
}

// 括弧（単位など）を除いた正規化：「460（ミリ秒）」と「460」を一致させる
function stripParens(s: string): string {
  return normalizeAns(s).replace(/\([^)]*\)/g, "");
}

// 短答向けのゆるい正規化：中黒・長音・ハイフンを除いて表記ゆれを吸収
// （例：サーバ／サーバー、フォレンジックス／フォレンジクス）
function looseKey(s: string): string {
  return normalizeAns(s).replace(/[・･\-]/g, "");
}

// カンマ区切りを順不同の集合キーにする（key生成関数で正規化方法を切替）
function setKey(s: string, keyFn: (x: string) => string): string {
  return s
    .split(/[，、,]/)
    .map((x) => keyFn(x))
    .filter(Boolean)
    .sort()
    .join("|");
}

// 記号・数値・短答の自動採点。完全一致だけでなく、「又は」複数正解・順不同・
// 単位括弧・短答の表記ゆれを許容して取りこぼしを減らす。
function isAutoCorrect(input: string, correct: string, type: AnswerType): boolean {
  if (!input.trim()) return false;
  // 「又は」「または」で区切られた、いずれかに一致すれば正解
  const alts = correct.split(/又は|または/).map((x) => x.trim()).filter(Boolean);
  for (const alt of alts) {
    if (normalizeAns(input) === normalizeAns(alt)) return true;
    if (stripParens(input) === stripParens(alt)) return true;
    // カンマ区切りは順不同で集合一致を許容
    const inSet = setKey(input, normalizeAns);
    if (inSet && inSet === setKey(alt, normalizeAns)) return true;
    if (type === "short") {
      if (looseKey(input) === looseKey(alt)) return true;
      const inLoose = setKey(input, looseKey);
      if (inLoose && inLoose === setKey(alt, looseKey)) return true;
    }
  }
  return false;
}

const TYPE_BADGE: Record<AnswerType, { label: string; cls: string }> = {
  symbol: { label: "記号", cls: "bg-indigo-100 text-indigo-700" },
  number: { label: "数値", cls: "bg-emerald-100 text-emerald-700" },
  short: { label: "短答", cls: "bg-sky-100 text-sky-700" },
  text: { label: "記述", cls: "bg-violet-100 text-violet-700" },
};

export default function PmGrader({ pmQuestionId }: { pmQuestionId: string }) {
  const [subs, setSubs] = useState<SubAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState<boolean | null>(null); // 有料会員か（記述AI採点の可否）
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<Record<string, Grade>>({});
  const [showResult, setShowResult] = useState(false);
  const [grading, setGrading] = useState(false);
  const [open, setOpen] = useState(false); // 解答パネル（下部から引き出し）の開閉

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setInputs({});
      setGraded({});
      setShowResult(false);
      setGrading(false);
      const supabase = createSupabaseBrowserClient();
      // 設問データ（ビュー経由＝記述の模範解答 correct は含まれない。記号/数値/短答の correct のみ）
      const { data } = await supabase
        .from("pm_sub_answers_client")
        .select("id, pm_question_id, label, sub_order, answer_type, correct")
        .eq("pm_question_id", pmQuestionId)
        .order("sub_order");
      // 会員状態（自分の subscriptions を読む。RLSで本人のみ）
      let member = false;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();
        member =
          sub?.status === "active" &&
          (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      }
      if (active) {
        setSubs((data as SubAnswer[]) ?? []);
        setIsMember(member);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [pmQuestionId]);

  // 設問データが無い回（令和7秋以外）は何も表示しない＝従来の自己採点のまま
  if (loading || subs.length === 0) return null;

  const autoSubs = subs.filter((s) => s.answer_type !== "text");
  const textSubs = subs.filter((s) => s.answer_type === "text");

  const runGrade = async () => {
    track("grade_pm", { member: !!isMember, has_text: textSubs.length > 0 }); // 午後の採点を実行
    setShowResult(true);
    // 記号・数値・短答は即時判定、記述は会員ならAI採点・非会員は member_only
    const initial: Record<string, Grade> = {};
    const aiTargets: SubAnswer[] = [];
    for (const s of subs) {
      const inp = (inputs[s.id] ?? "").trim();
      if (s.answer_type === "text") {
        if (!inp) initial[s.id] = { status: "unanswered" };
        else if (!isMember) initial[s.id] = { status: "member_only" };
        else {
          initial[s.id] = { status: "pending" };
          aiTargets.push(s);
        }
      } else if (s.answer_type === "short") {
        // 短答：まず完全一致系で自動判定。外れても会員ならAIで表記ゆれ・同義語を救済する。
        if (!inp) initial[s.id] = { status: "unanswered" };
        else if (isAutoCorrect(inp, s.correct, s.answer_type)) initial[s.id] = { status: "correct" };
        else if (isMember) {
          initial[s.id] = { status: "pending" };
          aiTargets.push(s);
        } else initial[s.id] = { status: "wrong" };
      } else {
        // 記号・数値は完全一致系のみ（AI救済の対象外）
        if (!inp) initial[s.id] = { status: "unanswered" };
        else initial[s.id] = { status: isAutoCorrect(inp, s.correct, s.answer_type) ? "correct" : "wrong" };
      }
    }
    setGraded(initial);

    if (aiTargets.length === 0) return;
    setGrading(true);
    await Promise.all(
      aiTargets.map(async (s) => {
        try {
          const res = await fetch("/api/grade-pm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subId: s.id, userAnswer: inputs[s.id] }),
          });
          const data = await res.json();
          if (res.status === 403 && data?.code === "not_member") {
            setGraded((g) => ({ ...g, [s.id]: { status: "member_only" } }));
          } else if (!res.ok) {
            setGraded((g) => ({ ...g, [s.id]: { status: "error", comment: data?.error ?? "採点に失敗しました" } }));
          } else {
            // data.correct = サーバーが採点後に返す模範解答（記述の表示用）
            setGraded((g) => ({ ...g, [s.id]: { status: data.result, comment: data.comment, correct: data.correct } }));
          }
        } catch {
          setGraded((g) => ({ ...g, [s.id]: { status: "error", comment: "通信エラーが発生しました" } }));
        }
      })
    );
    setGrading(false);
  };

  const autoCorrect = autoSubs.filter((s) => graded[s.id]?.status === "correct").length;
  const textCounts = {
    correct: textSubs.filter((s) => graded[s.id]?.status === "correct").length,
    partial: textSubs.filter((s) => graded[s.id]?.status === "partial").length,
    wrong: textSubs.filter((s) => graded[s.id]?.status === "wrong").length,
  };
  const hasTextAnswered = textSubs.some((s) => graded[s.id]?.status === "member_only");

  // 採点結果に応じたカード配色（親しみ寄り：正解はemeraldで前向きに、不正解も柔らかいrose）
  const cardTone = (st?: GradeStatus) => {
    if (!showResult || !st) return "border-gray-200 bg-white";
    if (st === "correct") return "border-emerald-200 border-l-4 border-l-emerald-400 bg-emerald-50/70";
    if (st === "partial") return "border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/70";
    if (st === "wrong") return "border-rose-200 border-l-4 border-l-rose-400 bg-rose-50/70";
    if (st === "pending") return "border-violet-200 border-l-4 border-l-violet-300 bg-violet-50/70";
    return "border-gray-200 bg-white";
  };

  return (
    <>
      {/* 閉じている時：画面下に常時固定する「解答・採点」バー */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-500/40"
          >
            <ClipboardCheck className="w-5 h-5" />
            設問に解答・採点（{subs.length}問）
            {showResult && autoSubs.length > 0 && (
              <span className="text-sm font-semibold opacity-90">｜自動 {autoCorrect}/{autoSubs.length}正解</span>
            )}
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 開いている時：オーバーレイ＋下から引き出すパネル */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-violet-50/95 backdrop-blur rounded-t-2xl shadow-2xl border-t border-violet-200">
            <div className="max-w-3xl mx-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-violet-200 bg-violet-50/95 px-4 py-3 backdrop-blur">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-800">
                  <ClipboardCheck className="w-5 h-5 text-violet-600" /> 設問に解答して採点
                </h3>
                <button onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-500 hover:bg-violet-100" aria-label="閉じる">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-gray-500 leading-snug">
                  記号・数値・短答は自動で○×。
                  {isMember ? (
                    <span className="font-semibold text-violet-700">記述はAIが○△×＋講評で採点します。</span>
                  ) : (
                    <span>
                      記述の<span className="font-semibold text-violet-700">AI採点は有料会員限定</span>です。
                      <Link href="/premium" className="underline text-violet-700 hover:text-violet-900">
                        詳しく見る
                      </Link>
                    </span>
                  )}
                </p>

                <div className="space-y-2.5">
        {subs.map((s) => {
          const g = graded[s.id];
          const badge = TYPE_BADGE[s.answer_type];
          return (
            <div key={s.id} className={`rounded-xl border p-3 transition-colors ${cardTone(g?.status)}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-bold text-gray-700">{s.label}</span>
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${badge.cls}`}>{badge.label}</span>
                {s.answer_type === "text" && isMember === false && (
                  <Lock className="w-3.5 h-3.5 text-violet-400" />
                )}
                {showResult && g?.status === "correct" && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
                {showResult && g?.status === "partial" && <CircleDot className="w-5 h-5 text-yellow-500 ml-auto" />}
                {showResult && g?.status === "wrong" && <XCircle className="w-5 h-5 text-red-600 ml-auto" />}
                {showResult && g?.status === "pending" && <Loader2 className="w-5 h-5 text-violet-400 ml-auto animate-spin" />}
              </div>
              {s.answer_type === "text" ? (
                <textarea
                  value={inputs[s.id] ?? ""}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  rows={4}
                  placeholder="解答を入力（記述）"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base min-h-[6rem] focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              ) : (
                <input
                  value={inputs[s.id] ?? ""}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  placeholder={s.answer_type === "symbol" ? "記号（例：ア）" : s.answer_type === "number" ? "数値" : "解答"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              )}
              {showResult && g && (
                <div className="mt-2 text-sm leading-snug space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  {g.status === "correct" && <p className="font-bold text-green-700">○ 正解</p>}
                  {g.status === "partial" && <p className="font-bold text-yellow-700">△ 部分点</p>}
                  {g.status === "wrong" && (
                    <p className="text-red-700">
                      <span className="font-bold">× 不正解</span>
                      {s.answer_type !== "text" && (
                        <>
                          {" "}— 正解：<span className="font-bold">{s.correct}</span>
                        </>
                      )}
                    </p>
                  )}
                  {g.status === "pending" && <p className="text-violet-500">AIが採点中…</p>}
                  {g.status === "member_only" && (
                    <p className="flex items-center gap-1 font-semibold text-violet-700">
                      <Lock className="w-4 h-4" /> AI採点は有料会員限定です —{" "}
                      <Link href="/premium" className="underline hover:text-violet-900">
                        プレミアムのご案内
                      </Link>
                    </p>
                  )}
                  {g.status === "unanswered" && (
                    <p className="text-gray-400">
                      未回答{s.answer_type !== "text" && <> — 正解：{s.correct}</>}
                    </p>
                  )}
                  {g.status === "error" && <p className="text-red-500">採点エラー：{g.comment}</p>}
                  {/* 短答をAIで救済判定した場合の講評（完全一致は comment なし）。correct時は模範解答も表示 */}
                  {s.answer_type === "short" && g.comment && (g.status === "correct" || g.status === "wrong") && (
                    <>
                      <p className="flex items-center gap-1 text-gray-600 text-xs">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        AI判定：{g.comment}
                      </p>
                      {g.status === "correct" && (
                        <p className="text-violet-700 text-xs">
                          模範解答：<span className="font-semibold">{s.correct}</span>
                        </p>
                      )}
                    </>
                  )}
                  {/* 記述のAI講評・模範解答（採点された会員のみ） */}
                  {s.answer_type === "text" && (g.status === "correct" || g.status === "partial" || g.status === "wrong") && (
                    <>
                      {g.comment && (
                        <div className="mt-1 rounded-lg border border-violet-200 bg-violet-50 p-2.5">
                          <p className="mb-1 flex items-center gap-1 text-xs font-bold text-violet-700">
                            <Sparkles className="w-3.5 h-3.5" /> AIからの講評
                          </p>
                          <p className="text-sm leading-relaxed text-gray-800">{g.comment}</p>
                        </div>
                      )}
                      <p className="mt-1.5 text-xs text-gray-600">
                        模範解答：<span className="font-semibold text-gray-800">{g.correct || s.correct}</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        ※AIによる自動採点のため、判定・講評は絶対的な正解ではありません。あくまで参考としてご利用ください。
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={runGrade}
        disabled={grading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-base font-bold text-white shadow-md shadow-violet-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
      >
        {grading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-5 h-5" />}
        {grading ? "AI採点中…" : "採点する"}
      </button>

      {showResult && (
        <div className="rounded-xl border border-violet-200 bg-white p-3.5 text-center space-y-1.5">
          {autoSubs.length > 0 && (
            <p className="text-base font-bold text-gray-800">
              自動採点：{autoSubs.length}問中 <span className="text-violet-700">{autoCorrect}</span>問 正解
            </p>
          )}
          {textSubs.length > 0 && isMember && (
            <>
              <p className="flex items-center justify-center gap-1.5 text-sm text-gray-600">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                AI採点（記述{textSubs.length}問）：
                <span className="font-bold text-green-700">○{textCounts.correct}</span>
                <span className="font-bold text-yellow-600">△{textCounts.partial}</span>
                <span className="font-bold text-red-600">×{textCounts.wrong}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                ※記述のAI採点は参考情報です。実際の試験の採点基準とは異なる場合があります。
              </p>
            </>
          )}
          {hasTextAnswered && !isMember && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-violet-700 font-semibold">
              <Lock className="w-4 h-4" /> 記述のAI採点は有料会員限定です —{" "}
              <Link href="/premium" className="underline hover:text-violet-900">
                月額980円
              </Link>
            </p>
          )}
        </div>
      )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
