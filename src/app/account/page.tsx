import Link from "next/link";
import { Brain, ChevronLeft } from "lucide-react";
import { AccountClient } from "@/components/account-client";

export const metadata = {
  title: "会員登録 / ログイン｜過去問演習ラボ",
};

export default function AccountPage() {
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
            <div className="bg-indigo-600 rounded-lg p-1.5">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">会員登録 / ログイン</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <div className="max-w-md mx-auto space-y-4">
          <AccountClient />
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            会員登録すると、機種変更や別の端末でも同じメールアドレスでログインするだけで学習進捗を引き継げます。
          </p>
        </div>
      </main>
    </div>
  );
}
