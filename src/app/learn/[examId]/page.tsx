"use client";

// 学習する：モード選択ハブ（Canva Design School風）。
// 試験タブ＋4モード（ステップで学習／間違いの復習／問題演習＋横長の用語集）。
// コンテンツは中央寄せにして両サイドに余白を残す（将来の広告枠）。
// /learn/[examId]

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { basicExams, getExam } from "@/lib/exams";
import { setActiveExamStorage } from "@/lib/streak";
import { fetchLearnTerms } from "@/lib/supabase-browser";
import { fetchWrongPool } from "@/lib/review";
import { ArrowLeft, PenLine, RotateCcw, Search } from "lucide-react";
import { TopBarAccount } from "@/components/top-bar-account";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { MobileTopBar } from "@/components/mobile-top-bar";
import { BackToDashboard } from "@/components/back-to-dashboard";

// 2027年開始の新試験（仮称）。学習コンテンツはシラバス公開後。
// 問題演習は ready=true の試験で構成元試験の過去問を横断出題する（/exam/[id]/past が対応済み）。
const NEW_EXAM_INFO: Record<string, { label: string; practice: string; ready?: boolean }> = {
  dm: {
    label: "データマネジメント試験（仮称）",
    practice: "新設試験のため過去問はありません。IPA公表のサンプル問題と、シラバスにもとづくAI予想問題を出題できるよう準備中です。",
  },
  "pd-m": {
    label: "プロフェッショナルデジタルスキル（マネジメント）試験（仮称）",
    practice: "構成元となった ITストラテジスト・プロジェクトマネージャ・ITサービスマネージャ・システム監査技術者 の本物の過去問から出題",
    ready: true,
  },
  "pd-d": {
    label: "プロフェッショナルデジタルスキル（データ・AI）試験（仮称）",
    practice: "構成元となった データベーススペシャリスト の本物の過去問から出題（AI・データ分析の新領域はシラバス公開後に追加予定）",
    ready: true,
  },
  "pd-s": {
    label: "プロフェッショナルデジタルスキル（システム）試験（仮称）",
    practice: "構成元となった システムアーキテクト・ネットワークスペシャリスト・エンベデッドシステムスペシャリスト の本物の過去問から出題",
    ready: true,
  },
};
// 試験タブ1列目（ダッシュボードを選択と同じ顔ぶれ。応用情報はサイドバー下部の再編案内へ）
const EXAM_TABS = [
  { id: "ip", label: "ITパスポート" },
  { id: "fe", label: "基本情報技術者" },
  { id: "sc", label: "情報処理安全確保支援士" },
];

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8", brandSoft: "#EAF0FE",
  warn: "#C2410C", warnSoft: "#FBEDE6", good: "#0F8A5F", goodSoft: "#E7F3EE",
  ex: "#6D28D9", exSoft: "#F1ECFB",
};

const shortJa = (name: string) => name.replace("試験", "");

export default function LearnHubPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const exam = basicExams.find((e) => e.id === examId);
  const newExam = NEW_EXAM_INFO[examId]; // 2027新試験ならその情報（学習は準備中・演習は構成元の説明）
  const switchExam = (id: string) => { setActiveExamStorage(id); router.push(`/learn/${id}`); };

  const [stats, setStats] = useState<{ cats: number; terms: number; glossary: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [wrong, setWrong] = useState<{ loggedIn: boolean; count: number } | null>(null);

  // このページで見ている試験を「選択中の試験」として保存し、他ページ（ホーム/タブバー/ダッシュボード）へ引き継ぐ
  useEffect(() => {
    if (getExam(examId)) setActiveExamStorage(examId);
  }, [examId]);

  useEffect(() => {
    let on = true;
    setLoading(true);
    (async () => {
      const rows = await fetchLearnTerms<{ category: string; exam_id: string }>("category, exam_id");
      if (!on) return;
      const mine = rows.filter((r) => r.exam_id === examId);
      setStats({ cats: new Set(mine.map((r) => r.category)).size, terms: mine.length, glossary: rows.length });
      setLoading(false);
    })();
    (async () => {
      const pool = await fetchWrongPool(examId);
      if (!on) return;
      setWrong({ loggedIn: pool.loggedIn, count: pool.ids.length });
    })();
    return () => {
      on = false;
    };
  }, [examId]);

  const hasContent = (stats?.terms ?? 0) > 0;

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      {/* モバイル＝共通トップバー（試験プルダウンで別試験のハブへ） */}
      <MobileTopBar exam={examId} onExamChange={switchExam} />
      {/* デスクトップ＝戻る＋アカウント群 */}
      <header className="sticky top-0 z-10 hidden border-b md:block" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 md:px-6">
          <Link href="/" aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex-1" />
          <BackToDashboard />
          <TopBarAccount />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-1.5 md:px-6 md:py-9">
        <div className="text-center">
          {/* 見出しはデスクトップのみ（モバイルは下のカードで自明なため非表示） */}
          <h1 className="hidden text-[26px] font-bold leading-snug md:block">4つのモードから選んで始めましょう</h1>
          <p className="mt-1.5 hidden text-[15px] md:block" style={{ color: C.muted }}>
            ステップで学習する・間違いを復習する・問題を解く・用語を引く。目的に合わせて使い分けられます。
          </p>
          {/* 試験タブ（デスクトップのみ。モバイルは上部プルダウンで切替） */}
          <div className="mt-2.5 hidden flex-wrap justify-center gap-2 md:mt-5 md:flex">
            {EXAM_TABS.map((e) => {
              const active = e.id === examId;
              return (
                <Link
                  key={e.id}
                  href={`/learn/${e.id}`}
                  className="whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-bold transition-colors md:px-5 md:text-[15px]"
                  style={
                    active
                      ? { background: C.brand, color: "#fff", border: `1px solid ${C.brand}`, boxShadow: "0 4px 12px rgba(29,78,216,0.25)" }
                      : { background: C.card, color: "#33415A", border: `1px solid ${C.line}` }
                  }
                >
                  {e.label}
                </Link>
              );
            })}
            {/* データマネジメント試験（仮称）はIPの次ステップ想定のため1列目（応用情報の横）に置く */}
            {(() => {
              const active = examId === "dm";
              return (
                <Link
                  href="/learn/dm"
                  className="whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-bold transition-colors md:px-5 md:text-[15px]"
                  style={
                    active
                      ? { background: C.brand, color: "#fff", border: `1px solid ${C.brand}`, boxShadow: "0 4px 12px rgba(29,78,216,0.25)" }
                      : { background: C.card, color: "#33415A", border: `1px solid ${C.line}` }
                  }
                >
                  {NEW_EXAM_INFO.dm.label}
                </Link>
              );
            })()}
          </div>
          {/* 2027年開始の新試験（仮称）タブ＝2列目 */}
          <div className="mt-2 hidden flex-wrap justify-center gap-2 md:flex">
            {Object.entries(NEW_EXAM_INFO).filter(([id]) => id !== "dm").map(([id, info]) => {
              const active = id === examId;
              return (
                <Link
                  key={id}
                  href={`/learn/${id}`}
                  className="whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-bold transition-colors"
                  style={
                    active
                      ? { background: C.brand, color: "#fff", border: `1px solid ${C.brand}`, boxShadow: "0 4px 12px rgba(29,78,216,0.25)" }
                      : { background: C.card, color: "#33415A", border: `1px solid ${C.line}` }
                  }
                >
                  {info.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:mt-8 md:grid-cols-3">
          {/* ① ステップで学習（学習→過去問演習） */}
          <div className="flex flex-col overflow-hidden rounded-[14px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[120px] items-center justify-center" style={{ background: C.brandSoft }}>
              <svg viewBox="0 0 120 60" width="150" height="74" aria-hidden="true">
                <path d="M18,46 L58,16 L100,40" fill="none" stroke={C.brand} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 8" />
                <circle cx="18" cy="46" r="10" fill={C.brand} />
                <path d="M14,46 l3,3 l6,-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="58" cy="16" r="10" fill="#fff" stroke={C.brand} strokeWidth="3" />
                <path d="M55,11.5 l8,4.5 l-8,4.5 z" fill={C.brand} />
                <circle cx="100" cy="40" r="9" fill="#DDE3EC" />
              </svg>
            </div>
            <div className="flex flex-1 flex-col px-6 pb-5 pt-4">
              <div className="text-[19px] font-bold">
                ステップで学習<span className="text-[14px]">（学習 → 過去問演習）</span>
              </div>
              <div className="mt-2 text-[13.5px]" style={{ color: C.muted }}>
                {newExam ? "シラバス公開後に対応" : loading ? "読み込み中…" : hasContent ? `収録 ${stats!.cats}分野・${stats!.terms}語` : "コンテンツ準備中"}
              </div>
              <p className="mb-4 mt-2.5 flex-1 text-[14.5px] leading-relaxed" style={{ color: C.muted }}>
                {newExam
                  ? "IPAのシラバスが公開されたあとに、この試験の学習コンテンツ（ステップ学習・用語）を公開します。"
                  : "用語を学んだら、その場で本物の過去問に挑戦。学習→演習の繰り返しで、テストに合格すると次のステップが開きます。"}
              </p>
              {hasContent ? (
                <Link
                  href={`/learn/${examId}/course`}
                  className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: C.brand }}
                >
                  分野を選んで始める
                </Link>
              ) : (
                <span className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold" style={{ background: "#EDF1F6", color: C.faint }}>
                  {newExam ? "近日公開" : "準備中"}
                </span>
              )}
            </div>
          </div>

          {/* ② 問題演習（本物の過去問。出題モードへ直接遷移できるリンク付き） */}
          <div className="flex flex-col overflow-hidden rounded-[14px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[120px] items-center justify-center gap-3.5" style={{ background: C.exSoft }}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
                <PenLine className="h-6 w-6" style={{ color: C.ex }} />
              </span>
              <span className="flex flex-col gap-1.5">
                {["ア", "イ", "ウ"].map((k, i) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold" style={{ color: C.ex }}>{k}</span>
                    <span className="h-2 rounded" style={{ background: i === 1 ? C.ex : "#D9CCF3", width: i === 1 ? 44 : 32 }} />
                  </span>
                ))}
              </span>
            </div>
            <div className="flex flex-1 flex-col px-6 pb-5 pt-4">
              <div className="text-[19px] font-bold">問題演習</div>
              <div className="mt-2 text-[13.5px]" style={{ color: C.muted }}>
                {newExam
                  ? newExam.ready
                    ? "構成元試験の本物の過去問・科目別に演習"
                    : "構成元試験の過去問で対策（準備中）"
                  : examId === "fe"
                    ? "本物のIPA過去問・科目A／科目B"
                    : "本物のIPA過去問・出題モード6種類"}
              </div>
              {newExam && !newExam.ready ? (
                // データマネジメント試験（構成元なし）＝準備中
                <>
                  <p className="mb-4 mt-2.5 flex-1 text-[14.5px] leading-relaxed" style={{ color: C.muted }}>
                    {newExam.practice}
                  </p>
                  <span className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold" style={{ background: "#EDF1F6", color: C.faint }}>
                    近日公開
                  </span>
                </>
              ) : newExam?.ready ? (
                // プロフェッショナルデジタルスキル系＝科目A-1／A-2／Bに区切って各ボタン
                <div className="mt-2.5 flex-1 space-y-4">
                  <div>
                    <div className="text-[13.5px] font-bold" style={{ color: C.ink }}>科目A-1（共通知識）</div>
                    <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: C.muted }}>
                      応用情報技術者試験 午前の本物の過去問から出題（共通知識＝科目A-1に相当）
                    </p>
                    <Link
                      href={`/exam/${examId}/past?subject=a1`}
                      className="mt-1.5 block w-full rounded-xl py-2.5 text-center text-[14px] font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: C.ex }}
                    >
                      科目A-1の問題演習を始める
                    </Link>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold" style={{ color: C.ink }}>科目A-2（専門知識）</div>
                    <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: C.muted }}>
                      {newExam.practice}
                    </p>
                    <Link
                      href={`/exam/${examId}/past`}
                      className="mt-1.5 block w-full rounded-xl py-2.5 text-center text-[14px] font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: C.ex }}
                    >
                      科目A-2の問題演習を始める
                    </Link>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold" style={{ color: C.ink }}>科目B（技能）</div>
                    <span className="mt-1.5 block w-full rounded-xl py-2.5 text-center text-[14px] font-bold" style={{ background: "#EDF1F6", color: C.faint }}>
                      近日公開（シラバス公開後）
                    </span>
                  </div>
                </div>
              ) : examId === "fe" ? (
                // 基本情報＝科目A（午前）のモード＋科目B（午後）の入口を両方置く
                <div className="mt-2.5 flex-1 space-y-4">
                  <div>
                    <div className="text-[13.5px] font-bold" style={{ color: C.ink }}>科目A（午前）</div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {[
                        { label: "年度別", href: `/exam/${examId}/past?mode=year` },
                        { label: "ランダム", href: `/exam/${examId}/past?mode=random` },
                        { label: "分野別", href: `/exam/${examId}/past?mode=category` },
                        { label: "誤答復習", href: `/exam/${examId}/past?mode=wrong` },
                        { label: "模試（タイマー）", href: `/exam/${examId}/past?mode=exam` },
                        { label: "AI予想問題", href: `/exam/${examId}/ai` },
                      ].map((m) => (
                        <Link
                          key={m.label}
                          href={m.href}
                          className="rounded-lg py-2 text-center text-[13.5px] font-bold transition-opacity hover:opacity-80"
                          style={{ background: C.exSoft, color: C.ex }}
                        >
                          {m.label}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={`/exam/${examId}/past`}
                      className="mt-2 block w-full rounded-xl py-2.5 text-center text-[14px] font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: C.ex }}
                    >
                      科目Aの問題演習を始める
                    </Link>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold" style={{ color: C.ink }}>科目B（午後）</div>
                    <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: C.muted }}>
                      アルゴリズム・セキュリティの公開過去問を独自解説つきで
                    </p>
                    <Link
                      href={`/exam/${examId}/b`}
                      className="mt-1.5 block w-full rounded-xl border-2 py-2.5 text-center text-[14px] font-bold transition-colors hover:bg-white"
                      style={{ borderColor: C.ex, color: C.ex }}
                    >
                      科目B（午後）を解く
                    </Link>
                  </div>
                </div>
              ) : (
                // IP・支援士など＝従来どおり6モードチップ＋開始ボタン
                <>
                  <div className="mb-4 mt-2.5 flex-1">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "年度別", href: `/exam/${examId}/past?mode=year` },
                        { label: "ランダム", href: `/exam/${examId}/past?mode=random` },
                        { label: "分野別", href: `/exam/${examId}/past?mode=category` },
                        { label: "誤答復習", href: `/exam/${examId}/past?mode=wrong` },
                        { label: "模試（タイマー）", href: `/exam/${examId}/past?mode=exam` },
                        { label: "AI予想問題", href: `/exam/${examId}/ai` },
                      ].map((m) => (
                        <Link
                          key={m.label}
                          href={m.href}
                          className="rounded-lg py-2 text-center text-[14px] font-bold transition-opacity hover:opacity-80"
                          style={{ background: C.exSoft, color: C.ex }}
                        >
                          {m.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/exam/${examId}/past`}
                    className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: C.ex }}
                  >
                    問題演習を始める
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ③ 間違いの復習（モバイルは下タブの「復習」があるため非表示） */}
          <div className="hidden flex-col overflow-hidden rounded-[14px] md:flex" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex h-[120px] items-center justify-center gap-3.5" style={{ background: C.warnSoft }}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
                <RotateCcw className="h-6 w-6" style={{ color: C.warn }} />
              </span>
              <span className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="h-2.5 w-5 rounded" style={{ background: i < 3 ? C.warn : "#F0CDBA" }} />
                ))}
              </span>
            </div>
            <div className="flex flex-1 flex-col px-6 pb-5 pt-4">
              <div className="text-[19px] font-bold">間違えた問題の復習</div>
              <div className="mt-2 text-[13.5px]" style={{ color: C.muted }}>
                {wrong === null ? "読み込み中…" : wrong.loggedIn ? `復習対象 ${wrong.count}問` : "会員登録で間違いが貯まります"}
              </div>
              <p className="mb-4 mt-2.5 flex-1 text-[14.5px] leading-relaxed" style={{ color: C.muted }}>
                演習で間違えた問題だけを1問ずつやり直して、克服するまで繰り返せます。
              </p>
              {newExam ? (
                <span className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold" style={{ background: "#EDF1F6", color: C.faint }}>
                  近日公開
                </span>
              ) : (
                <Link
                  href={`/learn/${examId}/review`}
                  className="block w-full rounded-xl py-3.5 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: C.warn }}
                >
                  間違いをやり直す
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 新試験の「〜とは？」説明（気になる人向け・IPA一次情報へのリンク付き） */}
        {newExam && (
          <div className="mt-5 rounded-[14px] border-2 px-6 py-5" style={{ borderColor: "#EC4899", background: "#FDF2F8" }}>
            <div className="text-[16px] font-bold" style={{ color: "#BE185D" }}>
              {examId === "dm" ? "データマネジメント試験（仮称）とは？" : "プロフェッショナルデジタルスキル試験（仮称）とは？"}
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "#5B2340" }}>
              {examId === "dm"
                ? "2027年度に開始が検討されている新設試験。データ・AI利活用の基本知識・技能を問う、ITパスポートの次のステップです。「科目A（知識）＋科目B（技能）」構成の全問多肢選択式（CBT）で、試験時間120分・計60問の案が公表されています。"
                : "2027年度に開始が検討されている新設試験。応用情報技術者と高度8区分を統合再編したもので、マネジメント／データ・AI／システムの3区分があります。「科目A-1（共通知識）＋科目A-2（専門知識）＋科目B（技能）」構成の全問多肢選択式（CBT）で、科目A-1は90分60問・科目A-2＋Bは120分35問の案が公表されています。"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-bold">
              <a
                href="https://www.ipa.go.jp/shiken/syllabus/henkou/2025/20260331.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-70"
                style={{ color: "#BE185D" }}
              >
                IPA公式：新試験制度の検討状況（一次情報）
              </a>
              <Link href="/reform-2027" className="underline underline-offset-2 hover:opacity-70" style={{ color: "#BE185D" }}>
                2027年試験再編ガイド（当サイトの解説）
              </Link>
            </div>
          </div>
        )}

        {/* ④ 用語集（横長） */}
        <div className="mt-5 flex flex-col gap-4 overflow-hidden rounded-[14px] md:flex-row md:items-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <div className="flex h-[92px] items-center justify-center gap-2.5 md:h-[112px] md:w-[260px] md:flex-none" style={{ background: C.goodSoft }}>
            {["あ", "か", "さ"].map((k) => (
              <span key={k} className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-white text-[15px] font-bold" style={{ color: "#0F6E56" }}>
                {k}
              </span>
            ))}
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full" style={{ background: C.good }}>
              <Search className="h-5 w-5 text-white" />
            </span>
          </div>
          <div className="flex-1 px-6 pb-1 md:px-2 md:py-4">
            <div className="text-[18px] font-bold">用語集はこちら</div>
            <div className="mt-1 text-[13.5px]" style={{ color: C.muted }}>
              {loading ? "読み込み中…" : `収録 ${stats?.glossary ?? 0}語（3試験共通）`}・全用語を1ページに。五十音・検索・試験レベル・分野の絞り込みですぐ引けます。
            </div>
          </div>
          <div className="px-6 pb-5 md:py-4 md:pl-0 md:pr-6">
            <Link
              href={`/learn/glossary?exam=${examId}`}
              className="block rounded-xl px-7 py-3.5 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: C.good }}
            >
              用語集を開く
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[12.5px]" style={{ color: C.faint }}>
          「間違えた問題の復習」「誤答復習」の対象は、演習の解答記録から自動で作られます。
        </p>
      </main>
      <MobileTabBar />
    </div>
  );
}
