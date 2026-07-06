import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { PremiumClient } from "@/components/premium-client";
import { BackToDashboard } from "@/components/back-to-dashboard";

export const metadata = {
  title: "プレミアム会員のご案内｜過去問演習ラボ",
  description:
    "月額980円で午後問題の記述式をAIが○△×＋講評で採点。応用情報技術者試験の記述対策を効率化します。",
  // Stripeからの ?checkout=success|cancel 変種を正規URLへ集約
  alternates: { canonical: "/premium" },
};

export default function PremiumPage() {
  return (
    <div className="min-h-screen">
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
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg p-1.5">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">プレミアム会員</span>
          </div>
          <BackToDashboard />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <div className="max-w-md mx-auto space-y-4">
          <PremiumClient />
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            お申し込みにより
            <Link href="/legal/terms" className="underline hover:text-gray-600">
              利用規約
            </Link>
            に同意したものとみなされます。
            <Link href="/legal/tokushoho" className="underline hover:text-gray-600">
              特定商取引法に基づく表記
            </Link>
            ・
            <Link href="/legal/privacy" className="underline hover:text-gray-600">
              プライバシーポリシー
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
