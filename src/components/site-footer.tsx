import { ExternalLink } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-2.5 text-center">
        <p className="text-xs text-gray-500 leading-relaxed">
          出典：IPA（独立行政法人情報処理推進機構）情報処理技術者試験・情報処理安全確保支援士試験
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            IPA公式サイト（過去問題）
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Link
            href="/account"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            会員登録 / ログイン
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/legal/terms"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            利用規約
          </Link>
          <Link
            href="/legal/tokushoho"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            特定商取引法に基づく表記
          </Link>
          <Link
            href="/legal/privacy"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            プライバシーポリシー
          </Link>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          過去問題は出典を明記のうえ使用しています。各問題の解説は本サービスが独自に作成したものです。
          <br />
          🔒 会員登録時のメールアドレスは、学習進捗の保存とログインにのみ使用します。
        </p>
      </div>
    </footer>
  );
}
