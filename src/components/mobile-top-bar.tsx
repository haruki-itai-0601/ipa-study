"use client";

// モバイル共通の上部バー（ホーム/データ/学習/復習で共有）。
// 左＝試験プルダウン（ITパスポート/基本情報技術者/応用情報技術者）、右＝試験日カウントダウン。
// 試験切替時の挙動はページ側が決める（onExamChange）。試験日の設定は設定タブ(/settings)へ。

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { basicExams } from "@/lib/exams";
import { daysUntil, getExamDate } from "@/lib/streak";
import { Check, ChevronDown } from "lucide-react";

const C = {
  ink: "#15202E", muted: "#677488", line: "#E7EBF1",
  brand: "#1D4ED8", brandSoft: "#EAF0FE", card: "#FFFFFF", dark: "#0E1B33",
};

const shortName = (name: string) => name.replace("試験", "");

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

  const current = basicExams.find((e) => e.id === exam) ?? basicExams[0];

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
            {shortName(current.name)}
            <ChevronDown className="h-4 w-4" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {open && (
            <div
              className="absolute left-0 top-full z-30 mt-1.5 w-60 overflow-hidden rounded-xl border shadow-xl"
              style={{ background: C.card, borderColor: C.line }}
              role="listbox"
            >
              {basicExams.map((e) => {
                const on = e.id === exam;
                return (
                  <button
                    key={e.id}
                    onClick={() => { onExamChange(e.id); setOpen(false); }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-[14.5px] font-bold"
                    style={{ color: on ? C.brand : C.ink, background: on ? C.brandSoft : C.card }}
                    role="option"
                    aria-selected={on}
                  >
                    {e.name}
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
