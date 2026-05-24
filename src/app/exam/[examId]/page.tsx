import { getExam } from "@/lib/exams";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, BookOpen, Zap, ArrowLeft, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// 仮の進捗データ
const mockStats = {
  past: { answered: 0, correct: 0 },
  ai: { answered: 0, correct: 0 },
};

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = getExam(examId);
  if (!exam) notFound();

  const pastAccuracy =
    mockStats.past.answered > 0
      ? Math.round((mockStats.past.correct / mockStats.past.answered) * 100)
      : 0;
  const aiAccuracy =
    mockStats.ai.answered > 0
      ? Math.round((mockStats.ai.correct / mockStats.ai.answered) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-br ${exam.color} rounded-xl w-10 h-10 flex items-center justify-center`}>
              <span className="text-white font-bold text-sm">{exam.shortName}</span>
            </div>
            <div>
              <div className="text-sm text-gray-500">高度情報処理技術者試験</div>
              <div className="font-bold text-gray-900 text-lg">{exam.name}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* この試験の進捗 */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            この試験の進捗
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* 過去問 */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-gray-700">過去問演習</span>
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{mockStats.past.answered}</div>
                    <div className="text-sm text-gray-500">解答数</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{pastAccuracy}%</div>
                    <div className="text-sm text-gray-500">正解率</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* AI予想問題 */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold text-gray-700">AI予想問題</span>
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{mockStats.ai.answered}</div>
                    <div className="text-sm text-gray-500">解答数</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{aiAccuracy}%</div>
                    <div className="text-sm text-gray-500">正解率</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 出題カテゴリ */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            出題カテゴリ
          </h2>
          <div className="flex flex-wrap gap-2">
            {exam.categories.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className={`text-sm px-3 py-1 ${exam.textColor} ${exam.badgeBg}`}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </section>

        {/* 演習モード選択 */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            演習モードを選ぶ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* 過去問演習 */}
            <Link href={`/exam/${examId}/past`}>
              <Card className="border-2 border-indigo-200 bg-indigo-50 hover:shadow-lg hover:border-indigo-400 transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-indigo-600 rounded-xl p-2.5">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">過去問演習</div>
                      <div className="text-sm text-gray-500">IPA公式の過去問を解く</div>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      実際の試験問題で本番対策
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      出題傾向をつかむ
                    </li>
                  </ul>
                  <div className="mt-4 text-xs text-gray-400">出典：IPA 情報処理技術者試験</div>
                </CardContent>
              </Card>
            </Link>

            {/* AI予想問題演習 */}
            <Link href={`/exam/${examId}/ai`}>
              <Card className="border-2 border-yellow-200 bg-yellow-50 hover:shadow-lg hover:border-yellow-400 transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-yellow-500 rounded-xl p-2.5">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">AI予想問題演習</div>
                      <div className="text-sm text-gray-500">AIが生成した予想問題を解く</div>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      IPAシラバスをベースに無限生成
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      苦手分野を重点的に対策
                    </li>
                  </ul>
                  <div className="mt-4 text-xs text-gray-400">IPAシラバスより作成したオリジナル予想問題</div>
                </CardContent>
              </Card>
            </Link>

          </div>
        </section>

      </main>
    </div>
  );
}
