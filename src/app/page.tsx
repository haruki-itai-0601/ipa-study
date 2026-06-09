import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TodayStats } from "@/components/today-stats";
import { AccountLink } from "@/components/account-link";
import { basicExams } from "@/lib/exams";
import { Brain, ChevronRight, Zap, BookMarked, Trophy, UserPlus, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-2 shadow-md shadow-indigo-500/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs md:text-sm text-gray-500 leading-tight">ITパスポート・基本情報・応用情報</div>
              <div className="font-bold text-gray-900 text-xl leading-tight whitespace-nowrap">過去問道場</div>
            </div>
          </div>
          <div className="flex flex-row flex-wrap items-center gap-2 md:flex-col md:items-end md:gap-1">
            <AccountLink />
            <Badge variant="secondary" className="text-xs md:text-sm">
              📚 本物のIPA過去問で演習
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
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-rich">
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
        </section>

        {/* メインの試験区分（IP・基本情報・応用情報） */}
        <section className="border-t border-gray-200 pt-6">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            試験区分を選んで演習する
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {basicExams.map((exam) => (
              <Link key={exam.id} href={`/exam/${exam.id}`} className="block">
                <Card
                  className={`group border ${exam.borderColor} bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`bg-gradient-to-br ${exam.color} rounded-2xl w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10 group-hover:scale-105 transition-transform`}
                        >
                          <span className="text-white font-bold text-base leading-none whitespace-nowrap">
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

        {/* 高度試験への導線（別ページ） */}
        <section>
          <Link href="/advanced" className="block">
            <Card className="border border-slate-200 bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl p-2.5 flex-shrink-0 shadow-md shadow-black/10">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">高度情報処理技術者試験はこちら</div>
                  <div className="text-sm text-gray-500">PM・セキスペ・ネスペ・デスペなど（午前Ⅰ・午前Ⅱ）</div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* その他のメニュー */}
        <section className="border-t border-gray-200 pt-6">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            チャレンジ・会員登録
          </h2>
          <div className="space-y-3">
            <Link href="/challenge" className="block">
              <Card className="border border-amber-200 bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-2.5 flex-shrink-0 shadow-md shadow-amber-500/30">
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
            <Link href="/account" className="block">
              <Card className="border border-emerald-200 bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2.5 flex-shrink-0 shadow-md shadow-emerald-500/30">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">メールで会員登録（無料）</div>
                    <div className="text-sm text-gray-500">機種変更・別端末でも学習進捗を引き継げます</div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
