"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { CheckCircle2, XCircle, ClipboardCheck, Sparkles } from "lucide-react";

type AnswerType = "symbol" | "number" | "short" | "text";

type SubAnswer = {
  id: string;
  label: string;
  sub_order: number;
  answer_type: AnswerType;
  correct: string;
  note: string;
};

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
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<Record<string, boolean | null>>({});
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setInputs({});
      setGraded({});
      setShowResult(false);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("pm_sub_answers")
        .select("*")
        .eq("pm_question_id", pmQuestionId)
        .order("sub_order");
      if (active) {
        setSubs((data as SubAnswer[]) ?? []);
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

  const runGrade = () => {
    const g: Record<string, boolean | null> = {};
    for (const s of subs) {
      if (s.answer_type === "text") {
        g[s.id] = null; // 記述は自動採点しない（模範解答を表示）
        continue;
      }
      const inp = inputs[s.id] ?? "";
      g[s.id] = inp.trim() ? normalizeAns(inp) === normalizeAns(s.correct) : null;
    }
    setGraded(g);
    setShowResult(true);
  };

  const correctCount = autoSubs.filter((s) => graded[s.id] === true).length;

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 shadow-rich p-5 space-y-4">
      <div className="flex items-start gap-2.5">
        <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-2 shadow-md shadow-violet-500/30 flex-shrink-0">
          <ClipboardCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-800">設問に解答して採点</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            記号・数値・短答は入力すると自動で○×判定します。記述は模範解答を表示します（AIによる記述採点は近日対応予定）。
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
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${badge.cls}`}>
                  {badge.label}
                </span>
                {showResult && g === true && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />
                )}
                {showResult && g === false && (
                  <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                )}
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
                  placeholder={
                    s.answer_type === "symbol"
                      ? "記号（例：ア）"
                      : s.answer_type === "number"
                        ? "数値"
                        : "解答"
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              )}
              {showResult && (
                <div className="mt-2 text-sm leading-snug">
                  {g === true ? (
                    <span className="font-bold text-green-700">○ 正解</span>
                  ) : g === false ? (
                    <span className="text-red-700">
                      <span className="font-bold">× 不正解</span> — 正解：
                      <span className="font-bold">{s.correct}</span>
                    </span>
                  ) : s.answer_type === "text" ? (
                    <span className="text-violet-700">
                      模範解答：<span className="font-semibold">{s.correct}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">未回答 — 正解：{s.correct}</span>
                  )}
                  {s.note && !s.note.includes("要確認") && (
                    <span className="block text-xs text-gray-400 mt-0.5">※ {s.note}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={runGrade}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-base font-bold text-white shadow-md shadow-violet-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        <ClipboardCheck className="w-5 h-5" />
        採点する
      </button>

      {showResult && (
        <div className="rounded-xl border border-violet-200 bg-white p-3.5 text-center space-y-1">
          <p className="text-base font-bold text-gray-800">
            自動採点：{autoSubs.length}問中 <span className="text-violet-700">{correctCount}</span>問 正解
          </p>
          {textSubs.length > 0 && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              記述{textSubs.length}問は模範解答を表示中（AI採点は近日対応）
            </p>
          )}
        </div>
      )}
    </div>
  );
}
