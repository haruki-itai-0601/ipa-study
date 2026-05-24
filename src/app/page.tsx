import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Brain, Target, TrendingUp, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";

const exams = [
  {
    id: "pm",
    name: "プロジェクトマネージャ試験",
    shortName: "PM",
    description: "プロジェクト計画・管理・リーダーシップを問う高度試験",
    categories: ["スコープ管理", "リスク管理", "品質管理", "コスト管理"],
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-600",
  },
  {
    id: "sc",
    name: "情報処理安全確保支援士試験",
    shortName: "SC",
    description: "セキュリティ設計・実装・管理を問う高度試験",
    categories: ["暗号化", "認証", "脆弱性", "インシデント対応"],
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-600",
  },
  {
    id: "st",
    name: "ITストラテジスト試験",
    shortName: "ST",
    description: "IT戦略立案・経営課題解決を問う高度試験",
    categories: ["IT戦略", "業務改革", "システム企画", "経営分析"],
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-600",
  },
  {
    id: "nw",
    name: "ネットワークスペシャリスト試験",
    shortName: "NW",
    description: "ネットワーク設計・構築・運用を問う高度試験",
    categories: ["TCP/IP", "ルーティング", "セキュリティ", "クラウド"],
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-600",
  },
  {
    id: "db",
    name: "データベーススペシャリスト試験",
    shortName: "DB",
    description: "DB設計・SQL・パフォーマンスチューニングを問う高度試験",
    categories: ["正規化", "SQL", "トランザクション", "チューニング"],
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-600",
  },
  {
    id: "sa",
    name: "システムアーキテクト試験",
    shortName: "SA",
    description: "システム設計・アーキテクチャ選定を問う高度試験",
    categories: ["要件定義", "アーキテクチャ", "信頼性設計", "移行計画"],
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    textColor: "text-teal-600",
  },
];

// 仮のダッシュボードデータ
const stats = {
  todayAnswered: 0,
  todayCorrect: 0,
  streak: 0,
};

export default function Home() {
  const todayAccuracy =
    stats.todayAnswered > 0
      ? Math.round((stats.todayCorrect / stats.todayAnswered) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 rounded-lg p-1.5">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">問題演習道場</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            AI予想問題
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* 今日の進捗 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            今日の進捗
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-1">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.todayAnswered}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">解答数</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Target className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {todayAccuracy}%
                </div>
                <div className="text-xs text-gray-500 mt-0.5">正解率</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.streak}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">連続日数</div>
              </CardContent>
            </Card>
          </div>

          {/* 今日の目標進捗バー */}
          <Card className="border-0 shadow-sm mt-3">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  今日の目標
                </span>
                <span className="text-sm text-gray-500">
                  {stats.todayAnswered} / 10問
                </span>
              </div>
              <Progress
                value={(stats.todayAnswered / 10) * 100}
                className="h-2"
              />
              {stats.todayAnswered === 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  今日はまだ解いていません。1問から始めましょう！
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 試験一覧 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            高度情報処理技術者試験から選ぶ
          </h2>
          <div className="space-y-3">
            {exams.map((exam) => (
              <Link key={exam.id} href={`/exam/${exam.id}`}>
                <Card
                  className={`border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${exam.bgColor} ${exam.borderColor}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`bg-gradient-to-br ${exam.color} rounded-xl w-12 h-12 flex items-center justify-center flex-shrink-0`}
                        >
                          <span className="text-white font-bold text-sm">
                            {exam.shortName}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                            {exam.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                            {exam.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {exam.categories.slice(0, 3).map((cat) => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className={`text-xs px-1.5 py-0 ${exam.textColor} bg-white/70`}
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <div className="h-6" />
      </main>
    </div>
  );
}
