import Link from "next/link";
import { Brain, ChevronLeft } from "lucide-react";
import { BackToDashboard } from "@/components/back-to-dashboard";

export const metadata = {
  title: "プライバシーポリシー｜過去問演習ラボ",
  description:
    "過去問演習ラボにおける個人情報の取り扱い（取得する情報・利用目的・外部サービス・開示請求など）について定めたプライバシーポリシーです。",
};

const sections: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. 取得する情報",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>メールアドレス（会員登録・ログインのため）</li>
        <li>学習データ（解答履歴・正誤・学習進捗など）</li>
        <li>
          決済情報（プレミアム会員の場合）。クレジットカード番号等の情報は決済代行会社（Stripe）が取得・管理し、当サービスはカード番号を保持しません。
        </li>
        <li>
          アクセス情報（Cookie、閲覧ページ、IPアドレス、ブラウザ・端末情報など。アクセス解析を通じて取得します）
        </li>
      </ul>
    ),
  },
  {
    heading: "2. 利用目的",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>本サービスの提供および本人確認・認証</li>
        <li>学習進捗の保存、弱点分析・出題などの機能提供</li>
        <li>プレミアム会員の決済・課金処理</li>
        <li>サービスの品質改善およびアクセス状況の分析</li>
        <li>重要なお知らせやお問い合わせへの対応</li>
      </ul>
    ),
  },
  {
    heading: "3. 第三者提供",
    body: "法令に基づく場合などを除き、ご本人の同意なく個人情報を第三者に提供することはありません。",
  },
  {
    heading: "4. 外部サービスの利用（委託）",
    body: (
      <>
        <p>
          運営のため、以下の外部サービスを利用しています。各社が定めるプライバシーポリシーに従って情報が取り扱われます。
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Supabase（データベース・認証基盤の提供）</li>
          <li>Stripe（クレジットカード決済の処理）</li>
          <li>Google アナリティクス（アクセス解析）</li>
        </ul>
      </>
    ),
  },
  {
    heading: "5. Cookie・アクセス解析",
    body: "本サービスはアクセス状況の把握のため Google アナリティクス（Cookie を使用）を利用しています。取得される情報は匿名で集計され、それ単体で個人を特定するものではありません。Cookie はブラウザの設定や Google が提供するオプトアウト アドオンにより無効化できます。",
  },
  {
    heading: "6. 安全管理",
    body: "取得した個人情報の漏えい・滅失・毀損の防止その他の安全管理のために、必要かつ適切な措置を講じます。",
  },
  {
    heading: "7. 開示・訂正・削除等のご請求",
    body: "ご本人からの個人情報の開示・訂正・利用停止・削除のご請求には、本人確認のうえ、法令に従い遅滞なく対応します。アカウントおよび学習データの削除をご希望の場合は、下記のお問い合わせ先までご連絡ください。",
  },
  {
    heading: "8. 本ポリシーの改定",
    body: "本ポリシーの内容は、法令の変更やサービス内容の変更に応じて改定することがあります。重要な変更がある場合は本サービス上でお知らせします。",
  },
  {
    heading: "9. お問い合わせ先",
    body: (
      <>
        運営者：板井 悠生
        <br />
        メール：haruki.itai.200601@gmail.com
      </>
    ),
  },
];

export default function PrivacyPage() {
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
            <span className="font-bold text-gray-900">プライバシーポリシー</span>
          </div>
          <BackToDashboard />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            プライバシーポリシー
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            過去問演習ラボ（以下「本サービス」）は、利用者の個人情報を以下のとおり取り扱います。
          </p>

          <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-rich divide-y divide-gray-200">
            {sections.map((s) => (
              <section key={s.heading} className="px-5 py-4">
                <h2 className="font-bold text-gray-900">{s.heading}</h2>
                <div className="mt-1.5 text-sm text-gray-700 leading-relaxed">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              href="/legal/terms"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              利用規約
            </Link>
            <Link
              href="/legal/tokushoho"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              特定商取引法に基づく表記
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
