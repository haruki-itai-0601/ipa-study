import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HomeDashboard } from "@/components/home-dashboard";
import { AccountLink } from "@/components/account-link";
import { Brain, ChevronRight, Zap, Trophy, UserPlus, GraduationCap, Sparkles } from "lucide-react";
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

        {/* ヒーロー：このサービスの価値（AI弱点分析で合格を目指す） */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-5 md:px-9 md:py-6 shadow-rich-lg">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-violet-300/20 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              AI弱点分析つき 過去問道場
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-bold leading-snug text-white">
              過去問を“ただ解く”だけでは、<br className="hidden sm:block" />
              合格は近づきません。
            </h1>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-indigo-100">
              AIがあなたの解答を分野ごとに分析し、<span className="font-semibold text-white">弱点を可視化</span>。
              次に解くべき問題を示して、<span className="font-semibold text-white">最短ルートで合格</span>へ導きます。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["IPA公式の本物の過去問", "図つき・独自AI解説", "弱点ダッシュボード"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 区分セレクタ＋弱点分析＋クイックスタート（ホームの主役） */}
        <HomeDashboard />

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
