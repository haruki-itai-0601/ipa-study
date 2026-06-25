import { Card, CardContent } from "@/components/ui/card";
import { HomeDashboard } from "@/components/home-dashboard";
import { HeaderToday } from "@/components/header-today";
import { AccountLink } from "@/components/account-link";
import { Brain, ChevronRight, Trophy, UserPlus, GraduationCap, Sparkles, Pencil } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-2 shadow-md shadow-indigo-500/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs md:text-sm text-gray-500 leading-tight">ITパスポート・基本情報・応用情報</div>
              <div className="font-bold text-gray-900 text-xl leading-tight whitespace-nowrap">過去問演習ラボ</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <HeaderToday />
            <AccountLink />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* ヒーロー：このサービスの価値（AI弱点分析で合格を目指す） */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-4 md:px-9 md:py-6 shadow-rich-lg">
          {/* ブループリント・グリッド（CSSのみ・Vercel/Linear風の質感／中心上から下へフェード） */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              maskImage: "radial-gradient(130% 110% at 50% 0%, #000 45%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(130% 110% at 50% 0%, #000 45%, transparent 100%)",
            }}
          />
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-violet-300/20 blur-2xl" />
          <div className="relative">
            <h1 className="text-lg md:text-2xl font-bold leading-snug text-white">
              “ただ解く”だけでは、合格は遠い。
            </h1>
            <p className="mt-2 text-sm md:text-base leading-relaxed text-indigo-100">
              過去問演習は<span className="font-semibold text-white">無料</span>。さらに、<span className="font-bold text-white">AIがあなたの弱点を分析</span>し、
              <br className="hidden sm:block" />
              応用情報の<span className="font-bold text-white">午後（記述式）はAIが○△×＋講評で採点</span>。
              <span className="font-bold text-white">自分で採点できない記述まで対策</span>できます。
            </p>
            {/* バリュー帯：AIエージェントの旗を先頭に置く */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-sm font-semibold text-white backdrop-blur-sm ring-1 ring-inset ring-white/25">
                <Sparkles className="w-4 h-4" />
                AIエージェントと、最短で合格へ
              </span>
              {["過去問演習は無料", "AIが弱点を分析", "午後・記述をAIが採点"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs md:text-sm font-semibold text-white backdrop-blur-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 区分セレクタ＋弱点分析＋クイックスタート（ホームの主役） */}
        <section id="dashboard" className="scroll-mt-6">
          <HomeDashboard />
        </section>

        {/* その他のメニュー */}
        <section className="border-t border-gray-200 pt-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-700 mb-3">
            <span className="inline-block w-1 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600" />
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

        {/* 高度試験への導線（別ページ・区分カードと同じデザイン） */}
        <section className="border-t border-gray-200 pt-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-700 mb-3">
            <span className="inline-block w-1 h-4 rounded-full bg-gradient-to-b from-slate-500 to-slate-700" />
            高度区分（PM・セキスペ・ネスペほか）
          </h2>
          <Link href="/advanced" className="block">
            <Card className="group border border-slate-300 bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10 group-hover:scale-105 transition-transform">
                      <GraduationCap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base leading-tight">
                        高度情報処理技術者試験
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 leading-snug">
                        PM・セキスペ・ネスペ・デスペなどの過去問演習（午前Ⅰ・午前Ⅱ）
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

      </main>

      {/* 右下の浮かぶ「問題を解く」FAB：押すと演習メニュー(#practice)へスムーズスクロール */}
      <a
        href="#practice"
        aria-label="問題を解く（演習メニューへ移動）"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/40 ring-1 ring-white/25 hover:-translate-y-0.5 hover:shadow-xl transition-all md:bottom-6 md:right-6"
      >
        <Pencil className="w-5 h-5" />
        問題を解く
      </a>
    </div>
  );
}
