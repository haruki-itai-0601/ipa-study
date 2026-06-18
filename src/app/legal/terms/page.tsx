import Link from "next/link";
import { Brain, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "利用規約｜過去問演習ラボ",
};

export default function TermsPage() {
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
            <span className="font-bold text-gray-900">利用規約</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-8 text-sm leading-relaxed text-gray-700">
          <div className="space-y-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              利用規約
            </h1>
            <p>
              この利用規約（以下「本規約」といいます）は、「過去問演習ラボ」（https://kakomon-dojo.com、以下「本サービス」といいます）の利用条件を定めるものです。利用者の皆さま（以下「ユーザー」といいます）は、本規約に同意のうえ本サービスをご利用ください。
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第1条（サービスの概要）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                本サービスは、独立行政法人情報処理推進機構（IPA）が実施する情報処理技術者試験等の過去問題を演習できる学習サービスです。
              </li>
              <li>
                掲載している過去問題は、IPAが公表した過去問題を出典を明記のうえ使用しています。各問題の解説は本サービスが独自に作成したものであり、IPAによる公式の解説ではありません。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第2条（会員区分）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                本サービスには、無料でご利用いただける「無料会員」と、有料の「プレミアム会員」（月額980円・税込）の区分があります。
              </li>
              <li>
                プレミアム会員は、午後試験の記述式問題に対するAI採点機能をはじめとする、本サービスが定める有料機能を利用できます。
              </li>
              <li>
                有料機能の内容および料金は、本サービス上に表示するものとし、変更する場合は事前に告知します。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第3条（AI採点に関する免責）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                AI採点機能は、人工知能（AI）による自動採点であり、その判定および講評の正確性・完全性を保証するものではありません。
              </li>
              <li>
                AI採点の結果は、実際の試験における採点基準・採点結果と異なる場合があります。
              </li>
              <li>
                AI採点の結果は、あくまで学習の参考情報としてご利用ください。AI採点の結果に起因してユーザーに生じた損害について、運営者は一切の責任を負いません。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第4条（料金および決済）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                プレミアム会員の料金は月額980円（税込）とし、決済はStripe, Inc.が提供する決済サービス（クレジットカード決済）により行います。
              </li>
              <li>
                料金はお申込み時に初回課金が行われ、以降は毎月自動的に更新・課金されます。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第5条（解約および返金）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                ユーザーは、マイページからいつでもプレミアム会員を解約できます。
              </li>
              <li>
                解約後も、当該請求期間の末日まではプレミアム会員の機能をご利用いただけます。
              </li>
              <li>
                日割りによる返金は行いません。また、デジタルコンテンツの性質上、サービス提供後の返品・返金はお受けできません。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第6条（禁止事項）
            </h2>
            <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>法令または公序良俗に違反する行為</li>
              <li>不正アクセス、またはこれを試みる行為</li>
              <li>
                本サービスのコンテンツ（解説・図・AI採点結果等）を、運営者の許可なく複製、転載、再配布、販売する行為
              </li>
              <li>
                本サービスのAPIその他のシステムを、本来の用途を超えて不正に利用する行為（自動化ツール等による大量アクセスを含みます）
              </li>
              <li>本サービスの運営を妨害する行為</li>
              <li>他のユーザーまたは第三者の権利・利益を侵害する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第7条（サービスの変更・中断・終了）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                運営者は、ユーザーへの事前の通知なく、本サービスの内容を変更し、または提供を中断・終了することができます。
              </li>
              <li>
                有料機能を終了する場合は、合理的な期間をもって事前に告知するよう努めます。
              </li>
              <li>
                本条に基づく本サービスの変更・中断・終了によりユーザーに生じた損害について、運営者は一切の責任を負いません。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第8条（免責事項）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                運営者は、本サービスの内容の正確性・完全性・有用性、および特定の目的（試験の合格を含みます）への適合性を保証しません。
              </li>
              <li>
                運営者は、本サービスの利用に起因してユーザーに生じた損害について、運営者の故意または重過失による場合を除き、一切の責任を負いません。
              </li>
              <li>
                運営者が責任を負う場合であっても、その賠償額は、当該ユーザーが直近1か月間に本サービスに支払った利用料金の額を上限とします。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第9条（規約の変更）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                運営者は、必要と判断した場合、本規約を変更することができます。
              </li>
              <li>
                変更後の規約は、本サービス上に掲示した時点から効力を生じます。重要な変更を行う場合は、本サービス上での告知等、適切な方法で周知します。
              </li>
              <li>
                変更後に本サービスを利用した場合、ユーザーは変更後の規約に同意したものとみなします。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
              第10条（準拠法・管轄裁判所）
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>本規約の解釈および適用は、日本法に準拠します。</li>
              <li>
                本サービスに関して紛争が生じた場合は、運営者の所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。
              </li>
            </ol>
          </section>

          <p className="text-gray-500">制定日：2026年6月13日</p>

          <div>
            <Link
              href="/legal/tokushoho"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              特定商取引法に基づく表記はこちら
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
