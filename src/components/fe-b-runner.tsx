"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { CheckCircle, XCircle, ChevronRight, RotateCcw, LayoutDashboard, UserPlus, Lightbulb } from "lucide-react";
import ZoomableImage from "@/components/zoomable-image";

export type FeBQ = {
  id: string;
  source: string;
  q_number: number;
  category: string; // 'algorithm' | 'security'
  title?: string;
  image_urls: string[]; // 問題ページ画像（1〜複数）
  options: string[]; // 選択肢キー（例 ["ア","イ","ウ","エ","オ","カ"]）可変個数
  correct: string; // 正解キー
  explanation?: string; // AI解説（任意）
};

const SOURCE_LABEL: Record<string, string> = {
  sample: "サンプル問題",
  "2023r05": "令和5年度",
  "2024r06": "令和6年度",
  "2025r07": "令和7年度",
};
const CATEGORY_LABEL: Record<string, string> = {
  algorithm: "アルゴリズムとプログラミング",
  security: "情報セキュリティ",
};

export default function FeBRunner({ questions, sourceLabel }: { questions: FeBQ[]; sourceLabel?: string }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setLoggedIn(!!data.user));
  }, []);

  const q = questions[idx];
  const total = questions.length;
  const isCorrect = selected === q?.correct;
  const isLast = idx + 1 >= total;

  const select = async (key: string) => {
    if (answered) return;
    setSelected(key);
    setAnswered(true);
    const correct = key === q.correct;
    if (correct) setScore((s) => s + 1);
    // 進捗を記録（ログイン時のみ）＝科目Bもストリーク等に算入
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_progress").insert({
          user_id: user.id,
          question_id: q.id,
          exam_id: "fe",
          year: `科目B ${SOURCE_LABEL[q.source] ?? q.source}`,
          is_correct: correct,
        });
      }
    } catch {
      // 記録失敗しても演習は続ける
    }
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIdx(idx + 1);
    setSelected(null);
    setAnswered(false);
  };

  const optionColor = (key: string) => {
    if (!answered) return "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
    if (key === q.correct) return "border-green-400 bg-green-50";
    if (key === selected && !isCorrect) return "border-red-400 bg-red-50";
    return "border-gray-200 bg-white opacity-60";
  };

  if (finished) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const msg = score === total ? "全問正解！すごい🎉" : pct >= 60 ? "good！合格圏です💪" : "復習して伸ばそう📚";
    return (
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-rich">
          <div className="text-sm text-gray-500 mb-1">基本情報 科目B{sourceLabel ? ` ・ ${sourceLabel}` : ""}</div>
          <div className="text-5xl font-bold text-gray-900 mb-1">
            {score}
            <span className="text-2xl text-gray-400"> / {total}</span>
          </div>
          <div className="text-lg font-semibold text-indigo-600 mb-2">正答率 {pct}%</div>
          <div className="text-gray-700 mb-6">{msg}</div>
          <div className="mx-auto mb-8 h-3 max-w-sm overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="space-y-3">
            {loggedIn === false && (
              <Link
                href="/account"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-bold text-white shadow-md shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                無料登録で進捗・弱点分析を保存
              </Link>
            )}
            <Link
              href="/#dashboard"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-bold text-white shadow-md shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <LayoutDashboard className="w-5 h-5" />
              ダッシュボードに戻る
            </Link>
            <button
              onClick={() => {
                setIdx(0);
                setSelected(null);
                setAnswered(false);
                setScore(0);
                setFinished(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              <RotateCcw className="w-5 h-5" />
              もう一度
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!q) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">Q {idx + 1} / {total}</span>
        <span className="text-sm text-gray-400">{CATEGORY_LABEL[q.category] ?? q.category}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${((idx + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>

      {/* 問題（IPA公式ページの画像。複数ページは縦に表示） */}
      <div className="space-y-3">
        {q.image_urls.map((src, i) => (
          <ZoomableImage
            key={i}
            src={src}
            alt={`科目B 問${q.q_number}（${i + 1}）`}
            className="w-full h-auto rounded-lg border border-gray-200 bg-white"
          />
        ))}
      </div>

      {/* 解答群（画像内の選択肢に対応するキーを選ぶ） */}
      <p className="text-sm text-gray-500">解答群から選んでください（記号をタップ）</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {q.options.map((key) => (
          <button
            key={key}
            onClick={() => select(key)}
            disabled={answered}
            className={`flex items-center justify-center rounded-xl border-2 py-3 text-base font-bold transition-all duration-200 ${optionColor(key)} ${
              answered && key === q.correct ? "text-green-700" : answered && key === selected && !isCorrect ? "text-red-700" : "text-gray-700"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {answered && (
        <>
          <div className={`rounded-xl p-4 ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-700">正解！</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-700">不正解</span>
                  <span className="text-sm text-red-500">正解は {q.correct}</span>
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">出典：IPA 基本情報技術者試験 科目B（{SOURCE_LABEL[q.source] ?? q.source}）</p>
          </div>
          {q.explanation && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-amber-700">
                <Lightbulb className="w-4 h-4" /> 解説
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{q.explanation}</p>
              <p className="mt-2 text-[11px] text-gray-400">※AIが作成した解説です。公式解説ではないため参考程度にご利用ください。</p>
            </div>
          )}
          <div className="flex justify-center">
            <button
              onClick={next}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-10 py-3 text-base font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              {isLast ? "結果を見る" : "次の問題へ"}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </main>
  );
}
