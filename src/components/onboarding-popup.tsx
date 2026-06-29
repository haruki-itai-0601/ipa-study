"use client";

// 初回ユーザー向けオンボーディング・ポップアップ（iOSアプリ風・一度だけ表示）。
// 旧ヒーローLPの訴求をここへ集約。localStorage で既読管理。

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Check, X } from "lucide-react";

const KEY = "labOnboardedV1";
const FEATURES = [
  "過去問演習は すべて無料",
  "弱点を分野別に分析・可視化（正答率・レーダー）",
  "応用情報の午後（記述式）を AIが○△×＋講評で採点",
  "弱点分析を踏まえたレコメンドで「次の一手」まで提案",
];

export function OnboardingPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        const t = setTimeout(() => setOpen(true), 450); // ダッシュボードを一瞬見せてから
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-7"
        style={{ color: "#15202E" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="閉じる"
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ background: "#1D4ED8", boxShadow: "0 6px 16px rgba(29,78,216,0.3)" }}
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="text-[12px] font-bold" style={{ color: "#163FB0" }}>
          過去問演習ラボへ、ようこそ
        </div>
        <h2 className="mt-1 text-[20px] font-bold leading-snug">“ただ解く”だけでは、合格は遠い。</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "#677488" }}>
          過去問演習は無料。<b style={{ color: "#15202E" }}>弱点を分析</b>して次の一手を提案し、自分で採点できない記述問題は<b style={{ color: "#15202E" }}>AIが採点</b>します。
        </p>

        <ul className="mt-4 space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
              <span
                className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full"
                style={{ background: "#EAF0FE", color: "#1D4ED8" }}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={close}
          className="mt-5 w-full rounded-xl py-3 text-[15px] font-bold text-white"
          style={{ background: "#1D4ED8" }}
        >
          はじめる
        </button>
        <Link
          href="/account"
          onClick={close}
          className="mt-2 block text-center text-[12.5px] font-semibold"
          style={{ color: "#163FB0" }}
        >
          会員登録すると、学習進捗を保存できます →
        </Link>
      </div>
    </div>
  );
}
