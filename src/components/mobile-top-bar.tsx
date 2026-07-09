"use client";

// モバイル共通の上部バー（ホーム/データ/学習/復習で共有）。
// 左＝試験プルダウン（デスクトップと同じ顔ぶれ＝現行3試験＋2027新試験）、右＝試験日カウントダウン。
// 試験切替時の挙動はページ側が決める（onExamChange）。試験日の設定は設定タブ(/settings)へ。

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getExam } from "@/lib/exams";
import { daysUntil, getExamDate } from "@/lib/streak";
import { Check, ChevronDown } from "lucide-react";

const C = {
  ink: "#15202E", muted: "#677488", line: "#E7EBF1",
  brand: "#1D4ED8", brandSoft: "#EAF0FE", card: "#FFFFFF", dark: "#0E1B33",
};

const shortName = (name: string) => name.replace("試験", "");

// デスクトップ（ダッシュボード選択・サイドバー）と同じ顔ぶれ。応用情報は再編案内(/reform-2027)へ
const CURRENT_EXAMS = [
  { id: "ip", label: "ITパスポート試験" },
  { id: "fe", label: "基本情報技術者試験" },
  { id: "sc", label: "情報処理安全確保支援士試験" },
];
// モバイルの狭い幅で1行に収めるため、プロフェッショナル系は半角カナ表記にする
const NEW_EXAMS = [
  { id: "dm", label: "データマネジメント試験" },
  { id: "pd-m", label: "ﾌﾟﾛﾌｪｯｼｮﾅﾙﾃﾞｼﾞﾀﾙｽｷﾙ（ﾏﾈｼﾞﾒﾝﾄ）" },
  { id: "pd-d", label: "ﾌﾟﾛﾌｪｯｼｮﾅﾙﾃﾞｼﾞﾀﾙｽｷﾙ（ﾃﾞｰﾀ・AI）" },
  { id: "pd-s", label: "ﾌﾟﾛﾌｪｯｼｮﾅﾙﾃﾞｼﾞﾀﾙｽｷﾙ（ｼｽﾃﾑ）" },
];
const ALL_EXAMS = [...CURRENT_EXAMS, ...NEW_EXAMS];

export function MobileTopBar({ exam, onExamChange }: { exam: string; onExamChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // 試験日は全試験共通。ページ表示時に読む。
  useEffect(() => {
    setCountdown(daysUntil(getExamDate()));
  }, [exam]);

  // 外側クリックでプルダウンを閉じる
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = ALL_EXAMS.find((e) => e.id === exam) ?? { id: exam, label: getExam(exam)?.name ?? "試験を選択" };

  return (
    <header
      className="sticky top-0 z-20 border-b md:hidden"
      style={{ background: "rgba(255,255,255,0.92)", borderColor: C.line, backdropFilter: "blur(10px)" }}
    >
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-2">
        {/* 試験プルダウン（何の切替か分かるよう小さなラベルを添える） */}
        <div ref={ref} className="relative">
          <div className="mb-0.5 pl-1 text-[10.5px] font-medium" style={{ color: C.muted }}>
            試験の切り替えはこちらから
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-bold"
            style={{ background: C.brandSoft, color: C.brand }}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="max-w-[180px] truncate">{shortName(current.label)}</span>
            <ChevronDown className="h-4 w-4 flex-none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {open && (
            <div
              className="absolute left-0 top-full z-30 mt-1.5 max-h-[70vh] w-[min(20rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border shadow-xl"
              style={{ background: C.card, borderColor: C.line }}
              role="listbox"
            >
              <div className="px-4 pb-1 pt-2.5 text-[11px] font-bold" style={{ color: C.muted }}>現行試験</div>
              {CURRENT_EXAMS.map((e) => {
                const on = e.id === exam;
                return (
                  <button
                    key={e.id}
                    onClick={() => { onExamChange(e.id); setOpen(false); }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-[14px] font-bold leading-snug"
                    style={{ color: on ? C.brand : C.ink, background: on ? C.brandSoft : C.card }}
                    role="option"
                    aria-selected={on}
                  >
                    {e.label}
                    {on && <Check className="h-4 w-4 flex-none" />}
                  </button>
                );
              })}
              <div className="mt-1 border-t px-4 pb-1 pt-2.5 text-[11px] font-bold" style={{ borderColor: C.line, color: "#BE185D" }}>
                2027年開始の新試験（仮称）
              </div>
              {NEW_EXAMS.map((e) => {
                const on = e.id === exam;
                return (
                  <button
                    key={e.id}
                    onClick={() => { onExamChange(e.id); setOpen(false); }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-[14px] font-bold leading-snug"
                    style={{ color: on ? C.brand : C.ink, background: on ? C.brandSoft : C.card }}
                    role="option"
                    aria-selected={on}
                  >
                    {e.label}
                    {on && <Check className="h-4 w-4 flex-none" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* 試験日カウントダウン（タップで設定タブへ） */}
        {countdown != null ? (
          <Link href="/settings" className="flex-none rounded-full px-3 py-1.5 text-[11.5px] font-bold text-white" style={{ background: C.dark }}>
            本番まであと{countdown}日
          </Link>
        ) : (
          <Link href="/settings" className="flex-none rounded-full px-3 py-1.5 text-[11.5px] font-bold" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
            試験日を設定
          </Link>
        )}
      </div>
    </header>
  );
}
