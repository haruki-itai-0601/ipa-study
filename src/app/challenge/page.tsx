import { exams } from "@/lib/exams";
import { ArrowLeft, ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "5問チャレンジ｜過去問演習道場",
  description: "区分を選んで、過去問から5問。あなたは何問解ける？1分で腕試し！",
};

export default function ChallengeIndex() {
  return (
    <div className="min-h-screen">
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="text-sm text-gray-500">過去問演習道場</div>
            <div className="font-bold text-gray-900">5問チャレンジ</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900">区分を選んで腕試し！</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">本物のIPA過去問から5問。1分で「あなたは何問解ける？」。結果はXでシェアできます。</p>

        <div className="space-y-3">
          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/challenge/${exam.id}`}
              className="block bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className={`bg-gradient-to-br ${exam.color} rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-white font-bold leading-none whitespace-nowrap ${exam.shortName.length > 2 ? "text-[10px]" : "text-sm"}`}>
                    {exam.shortName}
                  </span>
                </div>
                <span className="flex-1 font-semibold text-gray-900">{exam.name}</span>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
