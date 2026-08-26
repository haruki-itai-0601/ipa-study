import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { PremiumClient } from "@/components/premium-client";
import { BackToDashboard } from "@/components/back-to-dashboard";

export const metadata = {
  // 【2026-08-26】有料プランの提供終了に伴い、価格の記載を削除し検索対象から除外
  title: "有料プランの提供終了について｜過去問演習ラボ",
  description:
    "有料プランの新規申し込みは終了しました。過去問演習・弱点分析・用語集などの機能は引き続きすべて無料でご利用いただけます。",
  robots: { index: false, follow: true },
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
            <span className="font-bold text-gray-900">有料プランについて</span>
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
