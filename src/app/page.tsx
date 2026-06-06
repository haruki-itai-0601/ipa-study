import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TodayStats } from "@/components/today-stats";
import { Brain, ChevronRight, Zap, BarChart3, BookMarked, Trophy } from "lucide-react";
import Link from "next/link";

// 午前Ⅰは全高度区分で共通なので、試験区分一覧とは分けて別枠で表示する
const am1Exam = {
  id: "am1",
  name: "午前Ⅰ（高度共通）",
  shortName: "午前Ⅰ",
  description: "全高度区分で共通の午前Ⅰ。基礎理論〜経営戦略まで幅広く出題",
  categories: ["テクノロジ系", "マネジメント系", "ストラテジ系"],
  color: "from-indigo-500 to-indigo-600",
  bgColor: "bg-indigo-50",
  borderColor: "border-indigo-200",
  textColor: "text-indigo-600",
};

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
  {
    id: "sm",
    name: "ITサービスマネージャ試験",
    shortName: "SM",
    description: "ITサービスの運用・管理・改善を問う高度試験",
    categories: ["サービス運用", "障害管理", "変更管理", "SLA"],
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-600",
  },
  {
    id: "au",
    name: "システム監査技術者試験",
    shortName: "AU",
    description: "ITシステムの監査・評価・リスク管理を問う高度試験",
    categories: ["監査計画", "内部統制", "リスク評価", "コンプライアンス"],
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-slate-600",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-indigo-600 rounded-lg p-2">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-500 leading-none whitespace-nowrap">高度情報処理技術者試験</div>
              <div className="font-bold text-gray-900 text-xl leading-tight whitespace-nowrap">問題演習道場</div>
            </div>
          </div>
          <div className="flex flex-row flex-wrap items-center gap-2 md:flex-col md:items-end md:gap-1">
            <Badge variant="secondary" className="text-xs md:text-sm">
              📚 過去問演習（令和元〜令和7年度）
            </Badge>
            <Badge variant="secondary" className="text-xs md:text-sm">
              <Zap className="w-3 h-3 mr-1" />
              IPAシラバスより作成したAI予想問題
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* 出典の明記（IPA公式過去問） */}
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <BookMarked className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 leading-relaxed">
            本サービスの過去問は、<span className="font-semibold text-gray-800">IPA（独立行政法人情報処理推進機構）</span>が公開している情報処理技術者試験・情報処理安全確保支援士試験の過去問題を、出典を明記のうえ使用しています。
            <span className="text-gray-500">（各問題の解説は本サービスが独自に作成したものです）</span>
          </p>
        </div>

        {/* 今日の進捗 */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide">
              今日の進捗
            </h2>
            <span className="text-sm text-gray-400">全試験の合計</span>
          </div>
          <TodayStats />
          <Link href="/analysis" className="block mt-3">
            <Card className="border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-indigo-600 rounded-xl p-2.5 flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">学習分析・弱点ダッシュボード</div>
                  <div className="text-sm text-gray-500">区分横断で進捗と苦手分野をチェック</div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/challenge" className="block mt-3">
            <Card className="border-2 border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-amber-500 rounded-xl p-2.5 flex-shrink-0">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">5問チャレンジ</div>
                  <div className="text-sm text-gray-500">区分を選んで腕試し・結果をシェアしよう</div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* 午前Ⅰ（全区分共通） */}
        <section className="border-t border-gray-200 pt-6">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            高度情報処理技術者試験の午前Ⅰ（全区分共通）はこちら
          </h2>
          <Link href={`/exam/${am1Exam.id}`} className="block">
            <Card
              className={`border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${am1Exam.bgColor} ${am1Exam.borderColor}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`bg-gradient-to-br ${am1Exam.color} rounded-xl w-14 h-14 flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-white font-bold text-sm leading-none whitespace-nowrap">
                        {am1Exam.shortName}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base leading-tight">
                        {am1Exam.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 leading-snug">
                        {am1Exam.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {am1Exam.categories.map((cat) => (
                          <Badge
                            key={cat}
                            variant="secondary"
                            className={`text-sm px-2 py-0 ${am1Exam.textColor} bg-white/70`}
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* 試験一覧 */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            高度情報処理技術者試験の午前Ⅱは試験区分から選ぶ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exams.map((exam) => (
              <Link key={exam.id} href={`/exam/${exam.id}`} className="h-full">
                <Card
                  className={`h-full border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${exam.bgColor} ${exam.borderColor}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`bg-gradient-to-br ${exam.color} rounded-xl w-14 h-14 flex items-center justify-center flex-shrink-0`}
                        >
                          <span className={`text-white font-bold leading-none whitespace-nowrap ${exam.shortName.length > 2 ? "text-sm" : "text-base"}`}>
                            {exam.shortName}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-base leading-tight">
                            {exam.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 leading-snug">
                            {exam.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {exam.categories.slice(0, 3).map((cat) => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className={`text-sm px-2 py-0 ${exam.textColor} bg-white/70`}
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
