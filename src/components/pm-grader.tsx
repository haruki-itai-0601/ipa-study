"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { CheckCircle2, XCircle, CircleDot, ClipboardCheck, Sparkles, Loader2, Lock } from "lucide-react";

type AnswerType = "symbol" | "number" | "short" | "text";

type SubAnswer = {
  id: string;
  label: string;
  sub_order: number;
  answer_type: AnswerType;
  correct: string;
  note: string;
};

// 採点結果。status は両系統で共通、comment は記述のAI講評／エラーメッセージ
type GradeStatus = "correct" | "partial" | "wrong" | "unanswered" | "pending" | "error" | "member_only";
type Grade = { status: GradeStatus; comment?: string };

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

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setInputs({});
      setGraded({});
      setShowResult(false);
      setGrading(false);
      const supabase = createSupabaseBrowserClient();
      // 設問データ
      const { data } = await supabase
        .from("pm_sub_answers")
        .select("*")
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
      } else {
        if (!inp) initial[s.id] = { status: "unanswered" };
        else initial[s.id] = { status: normalizeAns(inp) === normalizeAns(s.correct) ? "correct" : "wrong" };
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
            setGraded((g) => ({ ...g, [s.id]: { status: data.result, comment: data.comment } }));
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

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 shadow-rich p-5 space-y-4">
      <div className="flex items-start gap-2.5">
        <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-2 shadow-md shadow-violet-500/30 flex-shrink-0">
          <ClipboardCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-800">設問に解答して採点</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            記号・数値・短答は自動で○×。
            {isMember ? (
              <span className="font-semibold text-violet-700">記述はAIが○△×＋講評で採点します。</span>
            ) : (
              <span>
                記述の<span className="font-semibold text-violet-700">AI採点は有料会員限定</span>です。
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {subs.map((s) => {
          const g = graded[s.id];
          const badge = TYPE_BADGE[s.answer_type];
          return (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-3">
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
                  onChange={(e) => setInputs({ ...inputs, [s.id]: e.target.value })}
                  rows={2}
                  placeholder="解答を入力（記述）"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              ) : (
                <input
                  value={inputs[s.id] ?? ""}
                  onChange={(e) => setInputs({ ...inputs, [s.id]: e.target.value })}
                  placeholder={s.answer_type === "symbol" ? "記号（例：ア）" : s.answer_type === "number" ? "数値" : "解答"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              )}
              {showResult && g && (
                <div className="mt-2 text-sm leading-snug space-y-0.5">
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
                      <Lock className="w-4 h-4" /> AI採点は有料会員限定です
                    </p>
                  )}
                  {g.status === "unanswered" && (
                    <p className="text-gray-400">
                      未回答{s.answer_type !== "text" && <> — 正解：{s.correct}</>}
                    </p>
                  )}
                  {g.status === "error" && <p className="text-red-500">採点エラー：{g.comment}</p>}
                  {/* 記述のAI講評・模範解答（採点された会員のみ） */}
                  {s.answer_type === "text" && (g.status === "correct" || g.status === "partial" || g.status === "wrong") && (
                    <>
                      {g.comment && <p className="text-gray-600">{g.comment}</p>}
                      <p className="text-violet-700 text-xs">
                        模範解答：<span className="font-semibold">{s.correct}</span>
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
            <p className="flex items-center justify-center gap-1.5 text-sm text-gray-600">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              AI採点（記述{textSubs.length}問）：
              <span className="font-bold text-green-700">○{textCounts.correct}</span>
              <span className="font-bold text-yellow-600">△{textCounts.partial}</span>
              <span className="font-bold text-red-600">×{textCounts.wrong}</span>
            </p>
          )}
          {hasTextAnswered && !isMember && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-violet-700 font-semibold">
              <Lock className="w-4 h-4" /> 記述のAI採点は有料会員限定です
            </p>
          )}
        </div>
      )}
    </div>
  );
}
