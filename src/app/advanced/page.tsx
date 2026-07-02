import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { am1Exam, advancedExams } from "@/lib/exams";
import { Brain, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BackToDashboard } from "@/components/back-to-dashboard";

export const metadata = {
  title: "高度情報処理技術者試験｜過去問演習ラボ",
};

export default function AdvancedPage() {
  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
            トップ
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <div className="bg-indigo-600 rounded-lg p-1.5">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">高度情報処理技術者試験</span>
          </div>
          <BackToDashboard />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <p className="text-sm text-gray-500 leading-relaxed">
          高度情報処理技術者試験（午前Ⅰ・午前Ⅱ）の過去問演習です。本物のIPA過去問を出典明記のうえ収録しています。
        </p>

        {/* 午前Ⅰ（全区分共通） */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            午前Ⅰ（全区分共通）
          </h2>
          <Link href={`/exam/${am1Exam.id}`} className="block">
            <Card
              className={`group border bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${am1Exam.borderColor}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`bg-gradient-to-br ${am1Exam.color} rounded-2xl w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10 group-hover:scale-105 transition-transform`}
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
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* 高度8区分（午前Ⅱ） */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            試験区分から選ぶ（午前Ⅱ）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {advancedExams.map((exam) => (
              <Link key={exam.id} href={`/exam/${exam.id}`} className="h-full">
                <Card
                  className={`group h-full border bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${exam.borderColor}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`bg-gradient-to-br ${exam.color} rounded-2xl w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10 group-hover:scale-105 transition-transform`}
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
                                className={`text-sm px-2 py-0 ${exam.textColor} ${exam.badgeBg}`}
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
