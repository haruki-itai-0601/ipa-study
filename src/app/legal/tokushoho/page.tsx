import Link from "next/link";
import { Brain, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "特定商取引法に基づく表記｜過去問演習道場",
};

// 特定商取引法に基づく表記
const items: { label: string; value: React.ReactNode }[] = [
  {
    label: "販売事業者名",
    value: "板井 悠生",
  },
  {
    label: "運営責任者",
    value: "板井 悠生",
  },
  {
    label: "所在地",
    value: "請求があった場合、遅滞なく開示いたします。",
  },
  {
    label: "電話番号",
    value: "請求があった場合、遅滞なく開示いたします。",
  },
  {
    label: "メールアドレス",
    value: "haruki.itai.200601@gmail.com",
  },
  {
    label: "販売価格",
    value: "プレミアム会員 月額980円（税込）",
  },
  {
    label: "商品代金以外の必要料金",
    value: "インターネット接続にかかる通信費等はお客様のご負担となります。",
  },
  {
    label: "支払方法",
    value: "クレジットカード（Stripe決済）",
  },
  {
    label: "支払時期",
    value: "お申込み時に初回課金が行われ、以降は毎月自動的に更新・課金されます。",
  },
  {
    label: "商品の提供時期",
    value: "決済完了後、直ちにご利用いただけます。",
  },
  {
    label: "解約について",
    value:
      "マイページからいつでも解約できます。解約後も当該請求期間の末日までサービスをご利用いただけます。日割りでの返金は行っておりません。",
  },
  {
    label: "返品・キャンセル",
    value:
      "デジタルコンテンツの性質上、サービス提供後の返品・返金はお受けできません。",
  },
];

export default function TokushohoPage() {
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
            <span className="font-bold text-gray-900">
              特定商取引法に基づく表記
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            特定商取引法に基づく表記
          </h1>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-rich">
            <table className="w-full text-sm leading-relaxed">
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.label} className="flex flex-col sm:table-row">
                    <th className="bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 align-top whitespace-nowrap sm:w-56">
                      {item.label}
                    </th>
                    <td className="px-4 py-3 text-gray-700">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            本表記に関するお問い合わせは、上記メールアドレスまでお願いいたします。
          </p>

          <div className="text-sm">
            <Link
              href="/legal/terms"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              利用規約はこちら
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
