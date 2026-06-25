"use client";

import { useState } from "react";
import { getExam } from "@/lib/exams";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Lightbulb, ChevronRight, BookOpen, Share2, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export type ChQ = {
  id: string;
  exam_id: string;
  category: string;
  year: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "a" | "b" | "c" | "d";
  explanation: string;
};

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };
const HASHTAG: Record<string, string> = {
  am1: "高度情報処理", pm: "PM試験", sc: "セキスペ", nw: "ネスペ", db: "デスペ",
  sa: "SA試験", sm: "SM試験", st: "ST試験", au: "AU試験",
};

export default function ChallengeRunner({ examId, questions }: { examId: string; questions: ChQ[] }) {
  const exam = getExam(examId);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[idx];
  const total = questions.length;
  const isCorrect = selected === q?.correct_answer;

  const select = async (key: string) => {
    if (answered) return;
    setSelected(key);
    setAnswered(true);
    const correct = key === q.correct_answer;
    if (correct) setScore((s) => s + 1);

    // 進捗を記録（ログイン時のみ）＝チャレンジで解いた分もホームの弱点分析に反映される
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
    } catch {
      // 記録失敗しても演習は続ける
    }
  };
  const next = () => {
    if (idx + 1 >= total) { setFinished(true); return; }
    setIdx(idx + 1);
    setSelected(null);
    setAnswered(false);
  };

  const optionColors = (key: string) => {
    if (!answered) return "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
    if (key === q.correct_answer) return "border-green-400 bg-green-50";
    if (key === selected && !isCorrect) return "border-red-400 bg-red-50";
    return "border-gray-200 bg-white opacity-60";
  };

  if (finished) {
    const tag = HASHTAG[examId] || "高度情報処理";
    const pct = Math.round((score / total) * 100);
    const msg =
      score === total ? "全問正解！すごい🎉" : score >= total * 0.6 ? "good！この調子💪" : "伸びしろたっぷり！復習しよう📚";
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/challenge/${examId}?utm_source=x&utm_medium=social&utm_campaign=challenge_share`
        : "";
    const shareText = `${exam?.name ?? ""}の5問チャレンジ、${score}/${total}正解でした！🧠\nあなたは何問解ける？挑戦👇\n${shareUrl}\n#${tag} #高度情報処理`;
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}`;

    return (
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="text-sm text-gray-500 mb-1">{exam?.name} ・ 5問チャレンジ</div>
            <div className="text-5xl font-bold text-gray-900 mb-1">
              {score}<span className="text-2xl text-gray-400"> / {total}</span>
            </div>
            <div className="text-lg font-semibold text-indigo-600 mb-2">正答率 {pct}%</div>
            <div className="text-gray-700 mb-6">{msg}</div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-3">
              {/* 解いた直後の主役導線：弱点が反映されたダッシュボードへ戻る */}
              <Link
                href="/#dashboard"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-lg transition-all"
              >
                <LayoutDashboard className="w-5 h-5" />
                ダッシュボードに戻る（弱点を見る）
              </Link>
              <a
                href={intent}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                結果をXでシェア
              </a>
              <Link
                href={`/exam/${examId}/past`}
                className="flex items-center justify-center gap-2 border border-indigo-200 text-indigo-700 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                {exam?.name}をもっと演習する
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 w-full text-gray-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                もう一度（別の5問）
              </button>
            </div>
          </CardContent>
        </Card>
        <div className="text-center pt-4">
          <Link href="/challenge" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
            ほかの区分のチャレンジ →
          </Link>
        </div>
      </main>
    );
  }

  if (!q) return null;
  const options: Record<string, string> = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">Q {idx + 1} / {total}</span>
        <span className="text-sm text-gray-400">{q.category}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${((idx + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <p className="text-base leading-relaxed text-gray-900">{q.question}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(Object.entries(options) as [string, string][]).map(([key, value]) => (
          <button
            key={key}
            onClick={() => select(key)}
            disabled={answered}
            className={`w-full text-left border-2 rounded-xl p-4 transition-all duration-200 ${optionColors(key)}`}
          >
            <div className="flex items-start gap-3">
              <span className={`font-bold text-base flex-shrink-0 w-6 ${
                answered && key === q.correct_answer ? "text-green-600"
                  : answered && key === selected && !isCorrect ? "text-red-600" : "text-gray-400"
              }`}>{optionLabels[key]}</span>
              <span className="text-base text-gray-800 leading-relaxed">{value}</span>
              {answered && key === q.correct_answer && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-auto" />}
              {answered && key === selected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-auto" />}
            </div>
          </button>
        ))}
      </div>

      {answered && (
        <>
          <Card className={`border-0 shadow-sm ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? <><CheckCircle className="w-5 h-5 text-green-600" /><span className="font-bold text-green-700">正解！</span></>
                  : <><XCircle className="w-5 h-5 text-red-600" /><span className="font-bold text-red-700">不正解</span><span className="text-sm text-red-500">正解は {optionLabels[q.correct_answer]}</span></>}
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <button onClick={next} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
              {idx + 1 >= total ? "結果を見る" : "次の問題へ"}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </main>
  );
}
