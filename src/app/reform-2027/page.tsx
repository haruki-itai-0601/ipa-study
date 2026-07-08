import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BackToDashboard } from "@/components/back-to-dashboard";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Layers,
  BookOpenCheck,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";

const TITLE = "2027年 情報処理技術者試験の再編ガイド｜応用情報はどう変わる？";
const DESC =
  "2027年度からの情報処理技術者試験・情報処理安全確保支援士試験の再編を、IPA一次情報にもとづき整理。応用情報技術者試験は廃止されるのか、科目A＋科目B（CBT多肢選択）への移行、新設のデータマネジメント試験（仮称）・プロフェッショナルデジタルスキル試験（仮称）まで、いま何を準備すべきかを解説します。";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: "/reform-2027" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "/reform-2027",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: ["/og.png"],
  },
};

// 構造化データ（記事＋よくある質問）。検索での可視性を高める。
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: TITLE,
      description: DESC,
      inLanguage: "ja",
      datePublished: "2026-07-08",
      dateModified: "2026-07-08",
      author: { "@type": "Organization", name: "過去問演習ラボ" },
      publisher: { "@type": "Organization", name: "過去問演習ラボ" },
      mainEntityOfPage: "https://kakomon-labo.com/reform-2027",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "応用情報技術者試験は廃止されますか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "「廃止」ではなく制度再編です。現行の応用情報技術者試験は2026年度までは従来どおり実施され、2027年度から新しい試験体系（科目A＋科目B・CBT多肢選択）へ移行する方向で検討が進んでいます。今年度中に現行方式で取得することも可能です。",
          },
        },
        {
          "@type": "Question",
          name: "2027年からの新しい試験はどんな形式ですか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "プロフェッショナル区分は「科目A（共通知識・専門知識）＋科目B（技能）」の構成で、CBTの多肢選択式になる方向です。従来の午前I・午前II・午後記述という区分けが見直されます。",
          },
        },
        {
          "@type": "Question",
          name: "新しく増える試験区分はありますか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "IPAの改定案では、データマネジメント試験（仮称）と、高度区分を束ねるプロフェッショナルデジタルスキル試験（仮称）が示されています。いずれも正式名称・出題数・試験時間・合格基準は未発表です（2026年7月時点）。",
          },
        },
        {
          "@type": "Question",
          name: "新試験の過去問はまだありませんが、どう対策すればいいですか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "新試験の多くは既存区分の知識を土台にします。共通知識は応用情報技術者試験の午前で、専門知識は各高度区分の過去問で先取り対策が可能です。過去問演習ラボはこれらの本物の過去問を出典明記で収録しています。",
          },
        },
      ],
    },
  ],
};

// 新旧マッピング（IPA改定案ベース・区分名はすべて仮称）
const MAPPING: { group: string; provisional: string; from: string; note: string }[] = [
  {
    group: "マネジメント系",
    provisional: "プロフェッショナルデジタルスキル試験（仮称）",
    from: "ITストラテジスト／プロジェクトマネージャ／ITサービスマネージャ／システム監査",
    note: "戦略・管理・監査の知識を束ねる方向。",
  },
  {
    group: "データ・AI系",
    provisional: "データマネジメント試験（仮称） ほか",
    from: "データベーススペシャリスト ＋ AI・データ分析領域（新規）",
    note: "既存はDB中心。AI・データ活用が新たな主戦場。",
  },
  {
    group: "システム系",
    provisional: "プロフェッショナルデジタルスキル試験（仮称）",
    from: "システムアーキテクト／ネットワークスペシャリスト／エンベデッドシステムスペシャリスト",
    note: "設計・ネットワーク・組込みの知識を統合。",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide">
      {children}
    </h2>
  );
}

export default function Reform2027Page() {
  return (
    <div className="min-h-screen">
      {/* 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ヘッダー（共通パターン） */}
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
            <span className="font-bold text-gray-900">2027試験再編ガイド</span>
          </div>
          <BackToDashboard />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-8">
        {/* ヒーロー */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-8 md:px-9 md:py-10 shadow-rich-lg">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <CalendarClock className="h-3.5 w-3.5" />
              2027年度 制度再編
            </span>
            <h1 className="mt-3 text-2xl md:text-3xl font-bold leading-snug text-white">
              2027年、情報処理技術者試験はこう変わる。
              <br className="hidden md:block" />
              「応用情報は廃止？」の答え合わせ。
            </h1>
            <p className="mt-3 max-w-2xl text-sm md:text-[15px] leading-relaxed text-white/85">
              結論からいえば <b className="text-white">廃止ではなく再編</b> です。現行方式は2026年度まで実施され、
              2027年度から「科目A＋科目B・CBT多肢選択」の新体系へ移行する方向で検討が進んでいます。
              このページでは、何が変わり・いま何を準備できるのかを、IPAの一次情報にもとづいて整理します。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/shindan/ap"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 font-bold text-indigo-700 shadow-md transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4" />
                まず現在地をAI診断（無料）
              </Link>
              <Link
                href="/exam/ap"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-5 py-2.5 font-bold text-white ring-1 ring-inset ring-white/50 backdrop-blur-sm transition-transform hover:-translate-y-0.5"
              >
                現行の応用情報で対策する
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 何が変わる */}
        <section className="space-y-3">
          <SectionTitle>何が変わるのか</SectionTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich">
              <CardContent className="p-5">
                <div className="mb-2 inline-flex rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-2.5 shadow-md">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">科目A＋科目B型へ</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  午前I・午前II・午後記述という区分けを見直し、プロフェッショナル区分は
                  「科目A（共通知識＋専門知識）＋科目B（技能）」の構成に。
                </p>
              </CardContent>
            </Card>
            <Card className="border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich">
              <CardContent className="p-5">
                <div className="mb-2 inline-flex rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-2.5 shadow-md">
                  <BookOpenCheck className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">CBT・多肢選択に</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  記述式が中心だった高度区分も、CBT（コンピュータ）での多肢選択式へ。
                  情報処理安全確保支援士も出題形式が変わる方向です。
                </p>
              </CardContent>
            </Card>
            <Card className="border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich">
              <CardContent className="p-5">
                <div className="mb-2 inline-flex rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-2.5 shadow-md">
                  <CalendarClock className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">2027年度スタート</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  新体系は2027年度からの開始が検討されています。現行方式は
                  <b className="text-gray-800">2026年度まで</b>実施予定です。
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 応用情報はどうなる（不安検索の的） */}
        <section className="space-y-3">
          <SectionTitle>応用情報技術者試験はどうなる？</SectionTitle>
          <Card className="border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich">
            <CardContent className="p-5 md:p-6">
              <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-gray-700">
                <p>
                  「<b>応用情報 廃止</b>」という言葉が検索されていますが、正確には
                  <b>制度の再編</b>です。応用情報技術者試験で問われてきた知識は、新体系でも
                  「科目A（共通知識）」の土台として引き継がれる見込みです。
                </p>
                <p>
                  重要なのは次の2点です。
                </p>
                <ul className="ml-4 list-disc space-y-1.5 marker:text-indigo-400">
                  <li>
                    <b>現行方式は2026年度まで実施</b>。いまの出題形式で取得したい人は、今年度中の受験が選択肢になります。
                  </li>
                  <li>
                    新体系の<b>共通知識は応用情報の午前で先取り</b>できます。学び直しがムダになりにくい領域です。
                  </li>
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link
                  href="/exam/ap"
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5"
                >
                  応用情報の過去問で対策する
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/learn/ap"
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200 transition-transform hover:-translate-y-0.5"
                >
                  基礎から学び直す
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 新試験の全体像（マッピング） */}
        <section className="space-y-3">
          <SectionTitle>新試験の全体像（旧区分との対応）</SectionTitle>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-600">
            高度区分は大きく束ねられ、新設区分も加わる方向です。以下はIPAの改定案にもとづく整理で、
            <b className="text-gray-800">区分名はすべて仮称</b>です（正式名称・出題数・試験時間・合格基準は未発表）。
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {MAPPING.map((m) => (
              <Card
                key={m.group}
                className="border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich"
              >
                <CardContent className="p-5">
                  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    {m.group}
                  </span>
                  <h3 className="mt-2 font-bold leading-snug text-gray-900">{m.provisional}</h3>
                  <p className="mt-2 text-xs font-medium text-gray-400">構成元（現行区分）</p>
                  <p className="text-sm leading-relaxed text-gray-700">{m.from}</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{m.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-gray-400">
            ※ 新設の「データマネジメント試験（仮称）」は既存の高度区分に構成元がなく、ITパスポート等のデータ系知識からの
            ステップアップが想定されています。ITパスポート・基本情報からの学習導線づくりが有効です。
          </p>
        </section>

        {/* いまできる3ステップ */}
        <section className="space-y-3">
          <SectionTitle>いま準備できる3ステップ</SectionTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/shindan/ap">
              <Card className="group h-full border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich transition-all duration-200 hover:shadow-rich-lg hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-5">
                  <div className="text-xs font-bold text-indigo-500">STEP 1</div>
                  <h3 className="mt-1 font-bold text-gray-900">現在地をAIで診断</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    登録不要・無料。10問で弱点分野を可視化します。
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
                    AI合格診断へ
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/exam/ap">
              <Card className="group h-full border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich transition-all duration-200 hover:shadow-rich-lg hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-5">
                  <div className="text-xs font-bold text-indigo-500">STEP 2</div>
                  <h3 className="mt-1 font-bold text-gray-900">共通知識の土台を固める</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    応用情報・基本情報の午前で、科目Aの共通知識を先取り。
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
                    過去問演習へ
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/advanced">
              <Card className="group h-full border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich transition-all duration-200 hover:shadow-rich-lg hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-5">
                  <div className="text-xs font-bold text-indigo-500">STEP 3</div>
                  <h3 className="mt-1 font-bold text-gray-900">専門分野を過去問で対策</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    高度区分の本物の過去問で、専門知識を今から積み上げ。
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
                    高度区分へ
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* 出典・注記 */}
        <section className="rounded-2xl border border-gray-200/70 bg-gray-50/70 p-5">
          <div className="flex items-start gap-2 text-sm leading-relaxed text-gray-600">
            <Info className="mt-0.5 h-4 w-4 flex-none text-gray-400" />
            <div className="space-y-1.5">
              <p>
                本ページは、IPA（情報処理推進機構）が公開する
                「情報処理技術者試験及び情報処理安全確保支援士試験の見直しの検討状況について」および
                「出題範囲等の改定案」にもとづいて整理したものです（2026年7月時点）。
              </p>
              <p>
                新試験の<b>正式名称・出題数・試験時間・合格基準は未発表</b>であり、区分名は仮称です。
                最新情報は必ずIPA公式をご確認ください。制度の更新は
                <Link href="/reform-2027" className="text-indigo-600 underline underline-offset-2">
                  本ページ
                </Link>
                でも随時反映します。
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
