import type { Metadata } from "next";
import Link from "next/link";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { Brain, ChevronLeft, ChevronRight, Sparkles, ArrowRight, Info } from "lucide-react";

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
      dateModified: "2026-07-09",
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
            text: "IPAの改定案では、データマネジメント試験（仮称）と、応用情報・高度区分を束ねるプロフェッショナルデジタルスキル試験（仮称・マネジメント／データ・AI／システムの3区分）が示されています。試験時間・出題数の案は公表済み（例：プロフェッショナルデジタルスキル試験は科目A-1が90分60問、科目A-2＋科目Bが120分35問）ですが、正式名称・合格基準は未発表です（2026年7月時点）。",
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

// 新試験の試験時間・出題形式・出題数（IPA「検討状況」ページ 2026年4月28日更新の公表値。全問必須解答・今後変更の可能性あり）
const FORMAT_TABLE: { exam: string; status: string; rows: { subject: string; time: string; style: string; count: string }[] }[] = [
  {
    exam: "ITパスポート試験",
    status: "内容変更",
    rows: [{ subject: "—", time: "120分", style: "多肢選択式（四肢択一）", count: "100問" }],
  },
  {
    exam: "データマネジメント試験（仮称）",
    status: "新設",
    rows: [
      { subject: "科目A", time: "120分（A＋B合計）", style: "多肢選択式（四肢択一）", count: "48問" },
      { subject: "科目B", time: "", style: "多肢選択式", count: "12問" },
    ],
  },
  {
    exam: "情報セキュリティマネジメント試験",
    status: "継続",
    rows: [
      { subject: "科目A", time: "120分（A＋B合計）", style: "多肢選択式（四肢択一）", count: "48問" },
      { subject: "科目B", time: "", style: "多肢選択式", count: "12問" },
    ],
  },
  {
    exam: "基本情報技術者試験",
    status: "継続",
    rows: [
      { subject: "科目A", time: "90分", style: "多肢選択式（四肢択一）", count: "60問" },
      { subject: "科目B", time: "100分", style: "多肢選択式", count: "20問" },
    ],
  },
  {
    exam: "プロフェッショナルデジタルスキル試験（仮称）※マネジメント／データ・AI／システムの3区分共通",
    status: "新設",
    rows: [
      { subject: "科目A-1（共通知識）", time: "90分", style: "多肢選択式（四肢択一）", count: "60問" },
      { subject: "科目A-2（専門知識）", time: "120分（A-2＋B合計）", style: "多肢選択式（四肢択一）", count: "23問" },
      { subject: "科目B（技能）", time: "", style: "多肢選択式", count: "12問" },
    ],
  },
  {
    exam: "情報処理安全確保支援士試験",
    status: "出題形式・内容変更",
    rows: [
      { subject: "科目A-1", time: "45分", style: "多肢選択式（四肢択一）", count: "30問" },
      { subject: "科目A-2", time: "35分", style: "多肢選択式（四肢択一）", count: "25問" },
      { subject: "科目B", time: "120分", style: "多肢選択式", count: "12問" },
    ],
  },
];

// 左レールの目次（Cursor Changelog風の編集レイアウト）
const TOC = [
  { id: "changes", label: "何が変わるのか" },
  { id: "ap", label: "応用情報はどうなる？" },
  { id: "mapping", label: "新試験の全体像" },
  { id: "format", label: "試験時間・出題数" },
  { id: "steps", label: "いま準備できること" },
  { id: "sources", label: "出典・注記" },
];

export default function Reform2027Page() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
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

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
        {/* Cursor Changelog風: 左に細いメタレール・右に広い本文1カラム */}
        <div className="md:grid md:grid-cols-[190px_minmax(0,1fr)] md:gap-12">
          {/* ===== 左メタレール（デスクトップのみ・追従） ===== */}
          <aside className="hidden md:block">
            <div className="sticky top-24 space-y-7 text-sm">
              <div>
                <div className="text-xs font-medium text-gray-400">最終更新</div>
                <div className="mt-0.5 font-semibold text-gray-700">2026年7月9日</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400">目次</div>
                <nav className="mt-2 space-y-2">
                  {TOC.map((t) => (
                    <a
                      key={t.id}
                      href={`#${t.id}`}
                      className="block text-[13px] leading-snug text-gray-500 transition-colors hover:text-indigo-600"
                    >
                      {t.label}
                    </a>
                  ))}
                </nav>
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                IPA公表の検討状況（2026年4月28日更新）にもとづく整理。区分名はすべて仮称です。
              </p>
            </div>
          </aside>

          {/* ===== 本文 ===== */}
          <article className="min-w-0">
            {/* タイトル（タイポグラフィ型。ヒーローの塗りは使わない） */}
            <p className="text-xs font-bold tracking-widest text-indigo-600">2027年度 制度再編ガイド</p>
            <h1 className="mt-3 text-[28px] font-bold leading-snug text-gray-900 md:text-4xl md:leading-snug">
              2027年、情報処理技術者試験はこう変わる。
              <br className="hidden md:block" />
              「応用情報は廃止？」の答え合わせ。
            </h1>
            <p className="mt-2 text-xs text-gray-400 md:hidden">最終更新 2026年7月9日</p>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 md:text-[17px] md:leading-[1.9]">
              結論からいえば<b className="text-gray-900">廃止ではなく再編</b>です。応用情報と高度8区分は大きく統合され、
              2027年度から「科目A＋科目B・CBT多肢選択」の新体系へ移行する方向で検討が進んでいます（現行方式は2026年度まで）。
              このページでは、何が変わり・いま何を準備できるのかを、IPAの一次情報にもとづいて整理します。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shindan/ap"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <Sparkles className="h-4 w-4" />
                まず現在地をAI診断（無料）
              </Link>
              <Link
                href="/exam/ap"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200 transition-colors hover:bg-indigo-50"
              >
                現行の応用情報で対策する
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <hr className="my-10 border-gray-200" />

            {/* 何が変わる */}
            <section id="changes" className="scroll-mt-24">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">何が変わるのか</h2>
              <div className="mt-6 space-y-8">
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">① 応用情報＋高度8区分 → 3つの新区分に統合</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-700">
                    いちばん大きな変化はここ。応用情報技術者と高度8区分（ST・PM・SM・AU・DB・SA・NW・ES）が合体して、
                    <b className="text-gray-900">「プロフェッショナルデジタルスキル試験（仮称）」の3区分</b>
                    （マネジメント／データ・AI／システム）に再編されます。さらに入門〜中級向けに
                    <b className="text-gray-900">データマネジメント試験（仮称）が新設</b>されます。
                  </p>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">② 「午前・午後」から「科目A＋科目B」へ</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-700">
                    午前I・午前II・午後（記述・論述）という区分けが無くなり、基本情報と同じ
                    「科目A（知識）＋科目B（技能）」型に統一。プロフェッショナル3区分は
                    <b className="text-gray-900">科目A-1（共通知識）＋科目A-2（専門知識）＋科目B（技能）</b>の構成です。
                  </p>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">③ 全問CBT・多肢選択に（記述廃止）</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-700">
                    記述・論述が中心だった高度区分も、CBT（コンピュータ受験）の多肢選択式へ。
                    情報処理安全確保支援士も記述式から多肢選択式に変わる方向です（論述の扱いは2028年度以降に継続検討）。
                  </p>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">④ 2027年度に順次スタート</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-700">
                    IPAの検討状況では、<b className="text-gray-900">2027年度春頃</b>にITパスポート・基本情報・情報セキュリティマネジメント、
                    <b className="text-gray-900">2027年度夏〜秋頃</b>にデータマネジメント・プロフェッショナルデジタルスキル・支援士が開始予定。
                    現行方式は<b className="text-gray-900">2026年度の実施をもって終了</b>予定です。
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-10 border-gray-200" />

            {/* 応用情報はどうなる（不安検索の的） */}
            <section id="ap" className="scroll-mt-24">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">応用情報技術者試験はどうなる？</h2>
              <div className="mt-5 max-w-2xl space-y-3 text-[15px] leading-relaxed text-gray-700">
                <p>
                  「<b className="text-gray-900">応用情報 廃止</b>」という言葉が検索されていますが、正確には
                  <b className="text-gray-900">制度の再編</b>です。応用情報技術者試験で問われてきた知識は、新体系でも
                  「科目A（共通知識）」の土台として引き継がれる見込みです。
                </p>
                <p>重要なのは次の2点です。</p>
                <ul className="ml-4 list-disc space-y-1.5 marker:text-indigo-400">
                  <li>
                    <b className="text-gray-900">現行方式は2026年度まで実施</b>。いまの出題形式で取得したい人は、今年度中の受験が選択肢になります。
                  </li>
                  <li>
                    新体系の<b className="text-gray-900">共通知識は応用情報の午前で先取り</b>できます。学び直しがムダになりにくい領域です。
                  </li>
                </ul>
              </div>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href="/exam/ap"
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  応用情報の過去問で対策する
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/learn/ap"
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200 transition-colors hover:bg-indigo-50"
                >
                  基礎から学び直す
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

            <hr className="my-10 border-gray-200" />

            {/* 新試験の全体像（マッピング） */}
            <section id="mapping" className="scroll-mt-24">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">新試験の全体像（旧区分との対応）</h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-gray-600">
                応用情報と高度8区分は「プロフェッショナルデジタルスキル試験（仮称）」の3区分に大きく束ねられ、
                応用情報で問われてきた共通知識は3区分共通の<b className="text-gray-800">科目A-1</b>に引き継がれます。
                以下はIPAの改定案にもとづく整理で、<b className="text-gray-800">区分名はすべて仮称</b>です
                （正式名称・合格基準は未発表。試験時間・出題数は検討中の案が公表されています＝下表）。
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {MAPPING.map((m) => (
                  <div key={m.group} className="rounded-xl border border-gray-200 bg-white p-5">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                      {m.group}
                    </span>
                    <h3 className="mt-2 font-bold leading-snug text-gray-900">{m.provisional}</h3>
                    <p className="mt-2 text-xs font-medium text-gray-400">構成元（現行区分）</p>
                    <p className="text-sm leading-relaxed text-gray-700">{m.from}</p>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500">{m.note}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-gray-400">
                ※ 新設の「データマネジメント試験（仮称）」は既存の高度区分に構成元がなく、ITパスポート等のデータ系知識からの
                ステップアップが想定されています。ITパスポート・基本情報からの学習導線づくりが有効です。
              </p>
            </section>

            <hr className="my-10 border-gray-200" />

            {/* 試験時間・出題数（IPA公表の検討中案） */}
            <section id="format" className="scroll-mt-24">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">新試験の試験時間・出題数（IPA公表・検討中）</h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-gray-600">
                IPAの検討状況ページ（2026年4月28日更新）では、各試験の試験時間・出題形式・出題数の案が公表されています。
                <b className="text-gray-800">全問必須解答</b>で、いずれも多肢選択式です（今後変更の可能性があります）。
              </p>
              <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5 font-semibold">試験区分</th>
                      <th className="px-3 py-2.5 font-semibold">科目</th>
                      <th className="px-3 py-2.5 font-semibold">試験時間</th>
                      <th className="px-3 py-2.5 font-semibold">出題形式</th>
                      <th className="px-3 py-2.5 font-semibold">出題数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FORMAT_TABLE.map((ex) =>
                      ex.rows.map((r, i) => (
                        <tr key={`${ex.exam}-${r.subject}`} className={i === 0 ? "border-t border-gray-200" : "border-t border-dashed border-gray-100"}>
                          {i === 0 && (
                            <td rowSpan={ex.rows.length} className="px-4 py-2.5 align-top">
                              <div className="font-bold leading-snug text-gray-900">{ex.exam}</div>
                              <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{ex.status}</span>
                            </td>
                          )}
                          <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{r.subject}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{r.time}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{r.style}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-gray-900">{r.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-gray-400">
                出典：IPA「情報処理技術者試験及び情報処理安全確保支援士試験の見直しの検討状況について」（2026年4月28日更新）。
                記載は検討中の案であり、今後変更される場合があります。
              </p>
            </section>

            <hr className="my-10 border-gray-200" />

            {/* いまできる3ステップ */}
            <section id="steps" className="scroll-mt-24">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">いま準備できる3ステップ</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Link href="/shindan/ap" className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-indigo-300">
                  <div className="text-xs font-bold text-indigo-500">STEP 1</div>
                  <h3 className="mt-1 font-bold text-gray-900">現在地をAIで診断</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    登録不要・無料。10問で弱点分野を可視化します。
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
                    AI合格診断へ
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
                <Link href="/exam/ap" className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-indigo-300">
                  <div className="text-xs font-bold text-indigo-500">STEP 2</div>
                  <h3 className="mt-1 font-bold text-gray-900">共通知識の土台を固める</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    応用情報・基本情報の午前で、科目Aの共通知識を先取り。
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
                    過去問演習へ
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
                <Link href="/advanced" className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-indigo-300">
                  <div className="text-xs font-bold text-indigo-500">STEP 3</div>
                  <h3 className="mt-1 font-bold text-gray-900">専門分野を過去問で対策</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    高度区分の本物の過去問で、専門知識を今から積み上げ。
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
                    高度区分へ
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
            </section>

            <hr className="my-10 border-gray-200" />

            {/* 出典・注記 */}
            <section id="sources" className="scroll-mt-24">
              <div className="flex items-start gap-2 text-sm leading-relaxed text-gray-600">
                <Info className="mt-0.5 h-4 w-4 flex-none text-gray-400" />
                <div className="max-w-2xl space-y-1.5">
                  <p>
                    本ページは、IPA（情報処理推進機構）が公開する
                    「情報処理技術者試験及び情報処理安全確保支援士試験の見直しの検討状況について」（2026年4月28日更新）および
                    「出題範囲等の改定案」にもとづいて整理したものです（2026年7月時点）。
                  </p>
                  <p>
                    試験時間・出題数は<b>検討中の案として公表済み</b>ですが、新試験の<b>正式名称・合格基準は未発表</b>であり、区分名は仮称です。
                    最新情報は必ずIPA公式をご確認ください。制度の更新は
                    <Link href="/reform-2027" className="text-indigo-600 underline underline-offset-2">
                      本ページ
                    </Link>
                    でも随時反映します。
                  </p>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
