import { ExternalLink } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-2.5 text-center">
        <p className="text-xs text-gray-500 leading-relaxed">
          出典：IPA（独立行政法人情報処理推進機構）情報処理技術者試験・情報処理安全確保支援士試験
        </p>
        <a
          href="https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          IPA公式サイト（過去問題）
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <p className="text-xs text-gray-400 leading-relaxed">
          過去問題は出典を明記のうえ使用しています。各問題の解説は本サービスが独自に作成したものです。
          <br />
          🔒 メールアドレス・氏名などの個人情報は取得していません。
        </p>
      </div>
    </footer>
  );
}
